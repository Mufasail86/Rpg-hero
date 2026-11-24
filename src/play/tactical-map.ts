import PF from "pathfinding";

export interface Cell { x: number; y: number }
export type Tile = "floor" | "wall" | "table" | "rubble" | "rune";
export interface BattleMap { id: "arena" | "tavern"; title: string; width: number; height: number; tiles: Tile[][] }
export const cellKey = (cell: Cell) => `${cell.x},${cell.y}`;
export const sameCell = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function battleMap(id: BattleMap["id"]): BattleMap {
  const width = 12, height = 9;
  const tiles: Tile[][] = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) => x === 0 || y === 0 || x === width - 1 || y === height - 1 ? "wall" : "floor"));
  for (const cell of id === "arena" ? [[5, 3], [5, 4], [8, 6]] : [[4, 3], [5, 3], [4, 4], [5, 4], [8, 5], [9, 5], [7, 1], [8, 1], [9, 1]]) tiles[cell[1]][cell[0]] = id === "arena" ? "wall" : "table";
  tiles[5][6] = "rubble"; tiles[5][7] = "rubble";
  tiles[2][6] = "rune";
  return { id, title: id === "arena" ? "Зал испытаний" : "Таверна «Три кости»", width, height, tiles };
}

export function walkable(map: BattleMap, cell: Cell): boolean {
  const tile = map.tiles[cell.y]?.[cell.x];
  return tile != null && tile !== "wall" && tile !== "table";
}

export function gridDistance(a: Cell, b: Cell, system: "pf2e" | "dnd5e"): number {
  const x = Math.abs(a.x - b.x), y = Math.abs(a.y - b.y);
  return 5 * (Math.max(x, y) + (system === "pf2e" ? Math.floor(Math.min(x, y) / 2) : 0));
}

export function findPath(map: BattleMap, from: Cell, to: Cell, occupied: Cell[] = []): Cell[] {
  if (!walkable(map, to) || occupied.some(cell => sameCell(cell, to))) return [];
  const matrix = map.tiles.map((row, y) => row.map((_, x) => walkable(map, { x, y }) && !occupied.some(cell => cell.x === x && cell.y === y) ? 0 : 1));
  matrix[from.y][from.x] = 0;
  return new PF.AStarFinder({ diagonalMovement: PF.DiagonalMovement.OnlyWhenNoObstacles }).findPath(from.x, from.y, to.x, to.y, new PF.Grid(matrix)).map(([x, y]) => ({ x, y }));
}

export function pathCost(map: BattleMap, path: Cell[], system: "pf2e" | "dnd5e", diagonalBefore = 0): { feet: number; diagonals: number } {
  let feet = 0, diagonals = diagonalBefore;
  for (let index = 1; index < path.length; index++) {
    const diagonal = path[index].x !== path[index - 1].x && path[index].y !== path[index - 1].y;
    if (diagonal) diagonals++;
    const step = diagonal && system === "pf2e" && diagonals % 2 === 0 ? 10 : 5;
    feet += step * (map.tiles[path[index].y][path[index].x] === "rubble" ? 2 : 1);
  }
  return { feet, diagonals };
}

export function lineOfSight(map: BattleMap, a: Cell, b: Cell): { visible: boolean; cover: number } {
  // Resolve raster ties in one direction so two tokens agree on the same ray.
  const [from, to] = a.x < b.x || a.x === b.x && a.y <= b.y ? [a, b] : [b, a];
  const line = PF.Util.expandPath([[from.x, from.y], [to.x, to.y]]).slice(1, -1);
  return { visible: !line.some(([x, y]) => map.tiles[y]?.[x] === "wall"), cover: line.some(([x, y]) => map.tiles[y]?.[x] === "table") ? 2 : 0 };
}

export function coneCells(map: BattleMap, from: Cell, aim: Cell, range: number, system: "pf2e" | "dnd5e"): Cell[] {
  const dx = aim.x - from.x, dy = aim.y - from.y, length = Math.hypot(dx, dy);
  if (!length) return [];
  const cells: Cell[] = [];
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const vx = x - from.x, vy = y - from.y;
    const forward = (vx * dx + vy * dy) / length;
    const side = Math.abs(vx * dy - vy * dx) / length;
    if (forward > 0 && side <= forward * (system === "pf2e" ? 1 : 0.5) + 0.3 && gridDistance(from, { x, y }, system) <= range && lineOfSight(map, from, { x, y }).visible) cells.push({ x, y });
  }
  return cells;
}
