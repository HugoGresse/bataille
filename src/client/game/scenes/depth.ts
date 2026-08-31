/**
 * Also the render batching plan: objects sharing a depth render consecutively, so all the flat
 * shapes (polygons, rectangles) submit as one batch and all the map labels as another, instead of
 * alternating pipelines per town and flushing the GPU batch hundreds of times a frame.
 */
export const DEPTH_TILE_OVERLAY = 0.2
export const DEPTH_TOWN_MARK = 0.4
export const DEPTH_MAP_LABEL = 0.6
export const DEPTH_WAVE = 1
export const DEPTH_UNIT = 2
export const DEPTH_PATH = 3
