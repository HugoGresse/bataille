import { PublicPlayerState } from '../../../../server/model/GameState'
import { GameObjects } from 'phaser'
import { PolygonContainer } from '../../../../server/model/types/Polygon'

export class TilesColorsUpdater {
    private countriesPolygons: {
        [country: string]: CountryPolygons
    } = {}

    private lastCountries: string[] = []

    constructor(private scene: Phaser.Scene, countries: { [p: string]: PolygonContainer[] }) {
        this.countriesPolygons = Object.keys(countries).reduce(
            (
                acc: {
                    [country: string]: CountryPolygons
                },
                countryName
            ) => {
                acc[countryName] = new CountryPolygons(scene, countries[countryName])
                return acc
            },
            {}
        )
    }

    /**
     * Color the country polygon to the player. Also check the past coloration loop to uncolor them.
     * @param players
     */
    update(players: PublicPlayerState[]) {
        players.forEach((player) => {
            player.ctr.forEach((countryId) => {
                if (this.countriesPolygons[countryId]) {
                    this.countriesPolygons[countryId].setColor(player.c)
                } else {
                    console.log('This country id is missing in polygon', countryId)
                }

                this.lastCountries = this.lastCountries.filter((id) => id !== countryId)
            })
        })

        this.lastCountries.forEach((countryId) => {
            if (this.countriesPolygons[countryId]) {
                this.countriesPolygons[countryId].unColor()
            }
        })

        // Store last countries to un-color them on when lost at war
        this.lastCountries = []
        players.forEach((player) => {
            player.ctr.forEach((countryId) => {
                this.lastCountries.push(countryId)
            })
        })
    }
}

class CountryPolygons {
    private polygons: GameObjects.Polygon[] = []

    constructor(scene: Phaser.Scene, polygons: PolygonContainer[]) {
        polygons.forEach((polygon) => {
            const phaserPoly = scene.add.polygon(polygon.x, polygon.y, polygon.polygon, 0xff0000, 0)
            phaserPoly.setOrigin(0, 0)
            this.polygons.push(phaserPoly)
        })
    }

    public setColor(color: string) {
        this.polygons.forEach((polygon) => {
            polygon.setFillStyle(Number(color), 200)
        })
    }
    public unColor() {
        this.polygons.forEach((polygon) => {
            polygon.setFillStyle(0x000000, 0)
        })
    }
}
