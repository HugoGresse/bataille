import { TILE_WIDTH_HEIGHT, UnitsType } from '../../common/UNITS'
import { Position } from '../model/actors/Position'
import { Town } from '../model/map/Tile'
import { StickUnit } from '../model/actors/units/StickUnit'
import { GameMap } from '../model/map/GameMap'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { UnitAction } from '../../common/UnitAction'
import { NewUnitDataEvent } from '../../common/NewUnitDataEvent'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { UnitsProcessor } from './UnitsProcessor'

export class ActionsProcessor {
    constructor(private map: GameMap, private unitsProcessor: UnitsProcessor) {}

    addUnit(player: AbstractPlayer, { x, y, unitCount }: NewUnitDataEvent): BaseUnit | null {
        const unitTypeToCreate = UnitsType.Stick

        if (player.money >= unitTypeToCreate) {
            const position = new Position(x + TILE_WIDTH_HEIGHT / 2, y + TILE_WIDTH_HEIGHT / 2)
            const gridPosition = position.getRoundedPosition()
            const town = this.map.getTileAt<Town>(gridPosition.x, gridPosition.y)
            if (!town || !town.player || town.player.id !== player.id) {
                return null
            }
            const unit = new StickUnit(player, position)

            const unitCost = unitCount * unitTypeToCreate
            const spendableMoney = unitCost > player.money ? player.money / unitTypeToCreate : unitCost
            const unitLife = spendableMoney / unitTypeToCreate
            unit.life.setHP(unitLife)

            const createdUnit = this.unitsProcessor.addUnit(unit, player, gridPosition.x, gridPosition.y)
            if (createdUnit) {
                player.spendMoney(spendableMoney)
                return createdUnit
            }
        }
        return null
    }

    unitEvent(player: AbstractPlayer, event: UnitAction) {
        this.unitsProcessor.unitAction(player, event)
    }
}
