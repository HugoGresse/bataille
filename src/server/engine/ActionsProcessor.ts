import { TILE_WIDTH_HEIGHT, UnitsType } from '../../common/UNITS'
import { Position } from '../model/actors/Position'
import { Town } from '../model/map/Tile'
import { StickUnit } from '../model/actors/units/StickUnit'
import { Map } from '../model/map/Map'
import { AbstractPlayer } from '../model/player/AbstractPlayer'
import { UnitAction } from '../../common/UnitAction'
import { NewUnitDataEvent } from '../../common/NewUnitDataEvent'
import { BaseUnit } from '../model/actors/units/BaseUnit'
import { UnitsProcessor } from './UnitsProcessor'

export class ActionsProcessor {
    constructor(private map: Map, private unitsProcessor: UnitsProcessor) {}

    addUnit(player: AbstractPlayer, { x, y }: NewUnitDataEvent): BaseUnit | null {
        if (player.money >= UnitsType.Stick) {
            const position = new Position(x + TILE_WIDTH_HEIGHT / 2, y + TILE_WIDTH_HEIGHT / 2)
            const gridPosition = position.getRoundedPosition()
            const town = this.map.getTileAt<Town>(gridPosition.x, gridPosition.y)
            if (!town || !town.player || town.player.id !== player.id) {
                return null
            }
            const unit = new StickUnit(player, position)
            const createdUnit = this.unitsProcessor.addUnit(unit, player, gridPosition.x, gridPosition.y)
            if (createdUnit) {
                player.spendMoney(UnitsType.Stick)
                return createdUnit
            }
        }
        return null
    }

    unitEvent(player: AbstractPlayer, event: UnitAction) {
        this.unitsProcessor.unitAction(player, event)
    }
}
