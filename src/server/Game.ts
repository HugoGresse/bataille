import { HumanPlayer } from './model/player/HumanPlayer'
import { GameLoop } from './GameLoop'
import { GameState, GameStatus, PrivatePlayerState, PrivatePlayerStateUpdate } from './model/GameState'
import { UnitAction } from '../common/UnitAction'
import { GameMap } from './model/map/GameMap'
import { SocketEmitter } from './SocketEmitter'
import { ExportType } from './model/types/ExportType'
import { townAssignation } from './utils/townAssignation'
import { NewUnitDataEvent } from '../common/NewUnitDataEvent'
import { ActionsProcessor } from './engine/ActionsProcessor'
import { AbstractPlayer } from './model/player/AbstractPlayer'
import { IAPlayer } from './model/player/IAPlayer'
import { UnitsProcessor } from './engine/UnitsProcessor'
import { GameUpdateProcessor } from './engine/GameUpdateProcessor'
import { PlayersById } from './model/types/PlayersById'
import { IncomeDispatcher } from './model/income/IncomeDispatcher'
import { INCOME_MS, RECONNECT_GRACE_MS } from '../common/GameSettings'
import { findDominantPlayer, townsToWin } from './engine/domination'
import { surrenderPlayer } from './engine/surrender'
import { Socket } from 'socket.io'

export class Game {
    private playersBySocketIds: PlayersById = {}
    private playersByIds: PlayersById = {}
    private players: AbstractPlayer[] = []
    private humanPlayers: HumanPlayer[] = []
    private iaPlayers: IAPlayer[] = []
    private gameLoop: GameLoop
    private map: GameMap
    private unitsProcessor: UnitsProcessor
    private actionsProcessor: ActionsProcessor
    private gameUpdateProcessor: GameUpdateProcessor
    protected incomeDispatcher: IncomeDispatcher = new IncomeDispatcher(INCOME_MS)
    /** Fixed by the map, so it is read once rather than on every tick of the loop */
    private readonly townCount: number
    /** Set the moment somebody holds enough of the map, and read back as the winner */
    private dominantPlayer: AbstractPlayer | null = null
    /** One clock per dropped human: when it runs out, the game moves on without them */
    private graceTimers = new Map<string, NodeJS.Timeout>()
    private abandonedListener: (() => void) | null = null
    /** Several grace clocks can run out in the same instant; the room is only declared empty once */
    private abandoned = false
    /** Set the tick the game is called, and kept: a player coming back late is still told the result */
    private ended = false

    constructor(
        public readonly id: string,
        protected emitter: SocketEmitter
    ) {
        this.map = new GameMap()
        this.gameLoop = new GameLoop(this.emitter, id, () => this.handleEnded())
        this.unitsProcessor = new UnitsProcessor()
        this.actionsProcessor = new ActionsProcessor(this.map, this.unitsProcessor)
        this.gameUpdateProcessor = new GameUpdateProcessor(
            this.map,
            this.playersByIds,
            this.emitter,
            this.unitsProcessor,
            this.incomeDispatcher
        )
        this.townCount = this.map.getTowns().length
    }

    getTownCount(): number {
        return this.townCount
    }

    /** Towns one player has to hold to take the game outright */
    getTownsToWin(): number {
        return townsToWin(this.townCount)
    }

    /** The player the map was called for, once one is that far ahead */
    getDominantPlayer(): AbstractPlayer | null {
        return this.dominantPlayer
    }

    getGameStartTime(): number {
        return this.gameLoop.gameStartTS
    }

    getGameDuration(): number {
        return this.gameLoop.gameDuration
    }

    export(): ExportType {
        return {
            gameId: this.id,
            map: this.map.export(),
            townsToWin: this.getTownsToWin(),
        }
    }

    /**
     * The board as it stands rather than what moved last tick: what a client building the board
     * from nothing is sent, at kick-off and on every return.
     */
    getFullState(): GameState {
        return {
            ...this.getState(),
            u: { updated: this.gameUpdateProcessor.getAllUnitsStates(), deleted: [] },
        }
    }

    getState(): GameState {
        const updatedUnits = this.gameUpdateProcessor.getLastUpdatedUnitsStates()
        const deletedUnits = this.gameUpdateProcessor.getLastDeletedUnitsStates()

        const players = this.players
            .map((player) => player.getPublicPlayerState())
            .sort((p1, p2) => {
                return p2.i - p1.i
            })

        return {
            s: this.gameLoop.isRunning ? GameStatus.running : GameStatus.stopped,
            ni: this.incomeDispatcher.getNextIncomeDelay(),
            ps: players,
            u: {
                updated: updatedUnits,
                deleted: deletedUnits,
            },
            t: this.gameUpdateProcessor.getLastTownsStates(),
        }
    }

    /** Whether this socket is one of the game's players: the emitters skip any other room member */
    hasSocket(socketId: string): boolean {
        return !!this.playersBySocketIds[socketId]
    }

    getPlayerPrivateState(socketId: string): PrivatePlayerState {
        return this.playersBySocketIds[socketId].getPrivatePlayerState()
    }
    getPlayerPrivateStateUpdate(socketId: string): PrivatePlayerStateUpdate {
        return this.playersBySocketIds[socketId].getPrivatePlayerStateUpdate()
    }

    addPlayer(player: AbstractPlayer, socketId: string) {
        if (this.gameLoop.isRunning) {
            console.log('Attempt to join a game but is already started...')
            return
        }
        if (!this.playersBySocketIds[socketId]) {
            this.playersByIds[player.id] = player
            this.playersBySocketIds[socketId] = player
            this.players.push(player)
            if (player instanceof IAPlayer) {
                player.setProcessor(this.actionsProcessor, this.unitsProcessor)
                this.iaPlayers.push(player)
            } else if (player instanceof HumanPlayer) this.humanPlayers.push(player)
        }
    }

    getPlayers(): AbstractPlayer[] {
        return this.players
    }

    /** Called once nobody human is left, grace period included: the server drops the game then */
    setAbandonedListener(listener: () => void) {
        this.abandonedListener = listener
    }

    watchDisconnect(player: HumanPlayer) {
        player.listenForDisconnect((reason) => this.onHumanDropped(player, reason))
    }

    /** The seat this token holds here, if any: live or not, a spectator has a seat too */
    findSeat(sessionToken: string | null): HumanPlayer | undefined {
        return sessionToken ? this.humanPlayers.find((human) => human.sessionToken === sessionToken) : undefined
    }

    /**
     * A player comes back on a new socket. Works whether or not the old socket was already noticed
     * as gone (a client reconnects in seconds, the server can take much longer to notice the drop),
     * for spectators as much as for live seats, and on a game that has already ended: they are
     * sent the board as it stands and, if it is over, how it ended.
     */
    reattach(player: HumanPlayer, socket: Socket) {
        this.clearGrace(player)
        const wasAway = !player.isConnected
        const previousSocketId = player.getSocketId()
        if (previousSocketId !== socket.id) {
            // Re-keyed before joining the room: a tick landing in between must never meet a socket
            // it cannot resolve to a player
            delete this.playersBySocketIds[previousSocketId]
            this.playersBySocketIds[socket.id] = player
            player.attachSocket(socket)
            this.watchDisconnect(player)
        } else {
            player.setConnected(true)
        }
        socket.join(this.id)
        if (wasAway && !player.isOut) {
            this.emitter.emitMessage(`${player.name} is back`, player)
        }
        this.emitter.emitInitialGameStateTo(socket.id, this)
        const end = this.getEndAnnouncement()
        if (end) {
            this.emitter.emitMessageToSpecificPlayer(end.result, socket.id, end.winner ?? player)
        }
    }

    /**
     * How the game ended, phrased once for the broadcast and again for anyone who comes back later.
     * Being the last one standing reads for itself; holding the map does not unless the numbers come
     * with it.
     */
    getEndAnnouncement(): { result: string; winner?: AbstractPlayer } | null {
        if (!this.ended) {
            return null
        }
        const winner = this.getWinner()
        if (!winner) {
            return { result: 'No winner, all players disconnected' }
        }
        const byDomination = this.dominantPlayer === winner
        return {
            result: byDomination
                ? `This game has been won by ${winner.name}, holding ${winner.townCount} of the ${this.townCount} towns`
                : `This game has been won by ${winner.name}`,
            winner,
        }
    }

    /**
     * A drop starts the grace clock rather than ending anything. Closing the connection on purpose
     * (the Exit button) is a choice, not an accident: that seat is given up on the spot.
     */
    private onHumanDropped(player: HumanPlayer, reason: string) {
        const intentional = reason === 'client namespace disconnect'
        if (intentional && this.gameLoop.isRunning && !player.isOut) {
            this.leave(player, `${player.name} left the game`)
        } else if (!intentional) {
            this.emitter.emitMessage(`ℹ️️ Player disconnected: ${player.name}`, player)
        }
        this.startGrace(player)
    }

    private startGrace(player: HumanPlayer) {
        this.clearGrace(player)
        const timer = setTimeout(() => {
            this.graceTimers.delete(player.id)
            if (!this.gameLoop.isRunning) {
                return // a finished game is dropped on its own clock, see handleEnded
            }
            if (!player.isConnected && !player.isOut) {
                this.leave(player, `${player.name} gave up: connection lost`)
            }
            // Empty only once nobody is left AND nobody is still owed a seat: another human in
            // their own grace window is not connected but has every right to come back
            if (this.getConnectedHumanPlayers().length === 0 && this.graceTimers.size === 0) {
                this.declareAbandoned()
            }
        }, RECONNECT_GRACE_MS)
        this.graceTimers.set(player.id, timer)
    }

    /** The game is over: nobody forfeits any more, and the room is dropped once late-comers had a chance */
    private handleEnded() {
        this.ended = true
        this.humanPlayers.forEach((player) => this.clearGrace(player))
        setTimeout(() => this.declareAbandoned(), RECONNECT_GRACE_MS)
    }

    private declareAbandoned() {
        if (this.abandoned) {
            return
        }
        this.abandoned = true
        this.abandonedListener?.()
    }

    private clearGrace(player: HumanPlayer) {
        const timer = this.graceTimers.get(player.id)
        if (timer) {
            clearTimeout(timer)
            this.graceTimers.delete(player.id)
        }
    }

    addUnit(socketId: string, event: NewUnitDataEvent) {
        if (!this.playersBySocketIds[socketId] || this.playersBySocketIds[socketId].isOut || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.addUnit(this.playersBySocketIds[socketId], event)
    }

    unitEvent(playerId: string, event: UnitAction) {
        if (!this.playersBySocketIds[playerId] || this.playersBySocketIds[playerId].isOut || !this.gameLoop.isRunning) {
            return
        }
        this.actionsProcessor.unitEvent(this.playersBySocketIds[playerId], event)
    }

    /** The player gives up: they stay connected to watch, but nothing of theirs is left in play */
    surrender(socketId: string) {
        const player = this.playersBySocketIds[socketId]
        if (!player || !this.gameLoop.isRunning) {
            return
        }
        this.leave(player, `${player.name} surrendered`)
    }

    /** Out of the game, by choice or by absence: the board forgets them and everyone is told why */
    private leave(player: AbstractPlayer, announcement: string) {
        const outcome = surrenderPlayer(player, this.map, this.unitsProcessor, this.players, this.emitter)
        if (!outcome) {
            return
        }
        this.gameUpdateProcessor.enqueue(outcome)
        this.gameUpdateProcessor.refreshTownCounts()
        this.emitter.emitMessage(announcement, player)
    }

    playerMessage(playerId: string, message: string) {
        if (!this.playersBySocketIds[playerId]) {
            return
        }
        this.emitter.emitMessage(message, this.playersBySocketIds[playerId], true)
    }

    start() {
        townAssignation(this.getPlayers(), this.map, this.unitsProcessor)
        // The starting towns are handed out here, before the loop has ever run: without this the
        // standings would open on zeroes and only catch up at the first capture.
        this.gameUpdateProcessor.refreshTownCounts()
        this.emitter.emitInitialGameState(this)
        setTimeout(() => {
            // Let clients be initialized before send this first message
            this.getConnectedHumanPlayers().forEach((player) => {
                // noinspection JSIgnoredPromiseFromCall
                this.emitter.emitMessageToSpecificPlayer(
                    `You are playing as ${player.name}`,
                    player.getSocketId(),
                    player
                )
            })
        }, 1500)
        if (!this.gameLoop.isRunning) {
            this.gameLoop.start(this)
        }
    }

    update(): boolean {
        this.gameUpdateProcessor.run()

        for (const player of this.iaPlayers) {
            player.update(this.map, this.unitsProcessor.getUnits())
        }

        // Holding almost the whole map ends it: the stragglers left over are not a game any more
        this.dominantPlayer = findDominantPlayer(this.players, this.townCount)
        if (this.dominantPlayer) {
            return true
        }

        // A dropped player is still in the game until their grace runs out and turns into a forfeit,
        // so only being out counts here: an empty room keeps playing for a minute, then ends itself
        const outPlayers = this.players.filter((player) => player.isOut).length
        const oneOrNoAlivePlayers = outPlayers >= this.players.length - 1 // one player cannot play alone
        const everyHumanOut = this.humanPlayers.every((player) => player.isOut)
        const over = everyHumanOut || (oneOrNoAlivePlayers && this.players.length > 1) // also check if we are playing alone (in dev)
        if (over) {
            this.ended = true
        }
        return over
    }

    getHumanPlayers(): HumanPlayer[] {
        return this.humanPlayers
    }

    getConnectedHumanPlayers(): HumanPlayer[] {
        return this.getHumanPlayers().filter((player) => player.isConnected)
    }

    getWinner(): AbstractPlayer | undefined {
        this.gameUpdateProcessor.printRuntimes()
        return this.dominantPlayer ?? this.players.find((player) => !player.isOut)
    }
}
