import {PublicPlayerState} from '../../../../server/model/GameState'
import {GameObjects} from 'phaser'
import {PolygonContainer} from '../../../../server/model/types/Polygon'

export class TilesColorsUpdater {

    private countriesPolygons : {
        [country: string]: CountryPolygons
    } = {}

    constructor(private scene: Phaser.Scene, countries: { [p: string]: PolygonContainer[] }) {
        this.countriesPolygons = Object.keys(countries)
            .reduce((acc:{
                [country: string]: CountryPolygons
            },  countryName) => {
                acc[countryName] = new CountryPolygons(scene, countries[countryName])
                return acc
            }, {})
    }

    update(players: PublicPlayerState[]) {
        players.forEach(player => {
            player.countries.forEach(countryId => {
                this.countriesPolygons[countryId].setColor(player.color)
            })
        })
    }
}

class CountryPolygons {

    private polygons: GameObjects.Polygon[] = []

    constructor(scene: Phaser.Scene, polygons: PolygonContainer[]) {

        polygons.map(polygon => {
            const phaserPoly = scene.add.polygon(polygon.x, polygon.y, polygon.polygon, 0xff0000, 0)
            phaserPoly.setOrigin(0, 0)
            this.polygons.push(phaserPoly)
        })

    }

    public setColor(color: string) {
        this.polygons.forEach(polygon => {
            polygon.setFillStyle(Number(color), 200)
        })
    }
}
