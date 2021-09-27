import { MapTiles } from '../../types/MapTiles'
import { Grid } from 'pathfinding'

export const generateGrid = (tiles: MapTiles = {}, width: number, height: number): Grid => {
    const grid = new Grid(width, height)

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            if (!tiles[x] || !tiles[x][y] || tiles[x][y].isCrossable()) {
                grid.setWalkableAt(x, y, true)
            } else {
                grid.setWalkableAt(x, y, false)
            }
        }
    }

    return grid
}
