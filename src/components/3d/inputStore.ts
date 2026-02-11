// 全局输入状态（键盘 + 触屏共用）
// 使用 mutable 对象避免 React 重渲染，在 useFrame 里直接读取

export interface InputState {
  // 方向输入 (-1 ~ 1)
  moveX: number // 左右: -1=左, 1=右
  moveZ: number // 前后: -1=后, 1=前
  jump: boolean
}

const inputState: InputState = {
  moveX: 0,
  moveZ: 0,
  jump: false,
}

// 键盘输入层
const keyboardState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
}

// 触屏输入层
const touchState = {
  moveX: 0,
  moveZ: 0,
  jump: false,
}

// 合并键盘与触屏输入
function mergeInput() {
  // 键盘方向
  let kx = 0
  let kz = 0
  if (keyboardState.forward) kz += 1
  if (keyboardState.backward) kz -= 1
  if (keyboardState.left) kx -= 1
  if (keyboardState.right) kx += 1

  // 取两个输入源中绝对值较大的
  inputState.moveX = Math.abs(touchState.moveX) > Math.abs(kx) ? touchState.moveX : kx
  inputState.moveZ = Math.abs(touchState.moveZ) > Math.abs(kz) ? touchState.moveZ : kz
  inputState.jump = keyboardState.jump || touchState.jump
}

// === 键盘 API ===

export function setKeyDown(code: string) {
  switch (code) {
    case 'KeyW': case 'ArrowUp':    keyboardState.forward = true; break
    case 'KeyS': case 'ArrowDown':  keyboardState.backward = true; break
    case 'KeyA': case 'ArrowLeft':  keyboardState.left = true; break
    case 'KeyD': case 'ArrowRight': keyboardState.right = true; break
    case 'Space': keyboardState.jump = true; break
  }
  mergeInput()
}

export function setKeyUp(code: string) {
  switch (code) {
    case 'KeyW': case 'ArrowUp':    keyboardState.forward = false; break
    case 'KeyS': case 'ArrowDown':  keyboardState.backward = false; break
    case 'KeyA': case 'ArrowLeft':  keyboardState.left = false; break
    case 'KeyD': case 'ArrowRight': keyboardState.right = false; break
    case 'Space': keyboardState.jump = false; break
  }
  mergeInput()
}

// === 触屏 API ===

export function setTouchMove(x: number, z: number) {
  touchState.moveX = x
  touchState.moveZ = z
  mergeInput()
}

export function setTouchJump(active: boolean) {
  touchState.jump = active
  mergeInput()
}

// === 读取 ===

export function getInput(): Readonly<InputState> {
  return inputState
}
