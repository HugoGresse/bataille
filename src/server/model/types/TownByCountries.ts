import { Town } from '../map/Tile'

export type TownByCountries = {
    [countryId: string]: Town[]
}
