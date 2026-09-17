const cat = document.getElementById('cat')
const sprite = document.getElementById('sprite')

const CAT_SIZE = 40
const IDLE_MIN_MS = 20_000
const IDLE_MAX_MS = 60_000
const SPEED_PX_PER_SECOND = 130
const FRAME_MS = 180

const sprites = (name) => `../sprites/${name}.png`
const frames = {
  sleep: ['sleep1', 'sleep2'],
  wake: ['awake', 'yawn1', 'yawn2'],
  left: ['left1', 'left2'],
  right: ['right1', 'right2'],
  arrive: ['scratch1', 'scratch2']
}

let taskbar = null
let state = 'sleeping'
let direction = 'right'
let x = 0
let animationFrame
let frameTimer
let idleTimer

function setSprite(name) {
  sprite.src = sprites(name)
}

function animate(sequence, duration = FRAME_MS) {
  let index = 0
  clearInterval(frameTimer)
  setSprite(sequence[index])
  frameTimer = setInterval(() => {
    index = (index + 1) % sequence.length
    setSprite(sequence[index])
  }, duration)
}

function stopAnimation() {
  clearInterval(frameTimer)
  frameTimer = undefined
}

function setNativePosition() {
  window.neko.setBounds({ x })
}

function randomIdleDelay() {
  return IDLE_MIN_MS + Math.random() * (IDLE_MAX_MS - IDLE_MIN_MS)
}

function scheduleAutomaticRun() {
  clearTimeout(idleTimer)
  if (state !== 'sleeping' || !taskbar?.visible) return
  idleTimer = setTimeout(() => beginRun(false), randomIdleDelay())
}

function updateTaskbar(next) {
  const becameHidden = taskbar && (!next.visible || !next.supported)
  taskbar = next

  if (!next.visible || !next.supported) {
    clearTimeout(idleTimer)
    cancelAnimationFrame(animationFrame)
    stopAnimation()
    state = 'hidden'
    return
  }

  const maxX = next.x + next.width - CAT_SIZE
  x = Math.max(next.x, Math.min(x || next.x, maxX))
  setNativePosition()

  if (becameHidden || state === 'hidden') {
    state = 'sleeping'
    direction = x <= next.x ? 'right' : 'left'
    animate(frames.sleep)
    scheduleAutomaticRun()
  } else if (state === 'sleeping') {
    scheduleAutomaticRun()
  }
}

function beginRun(fromClick) {
  if (!taskbar?.visible || !taskbar.supported || (state !== 'sleeping' && state !== 'hidden')) return
  if (state === 'hidden') return

  clearTimeout(idleTimer)
  state = 'waking'
  animate(frames.wake, 240)

  // The click path and timer path share one animation; the flag is reserved
  // for future behavior differences without allowing duplicate crossings.
  void fromClick
  setTimeout(() => {
    if (state !== 'waking' || !taskbar?.visible) return
    direction = x <= taskbar.x ? 'right' : 'left'
    state = 'running'
    animate(frames[direction])
    const destination = direction === 'right'
      ? taskbar.x + taskbar.width - CAT_SIZE
      : taskbar.x
    const start = performance.now()
    const startX = x
    const distance = Math.abs(destination - startX)
    const duration = Math.max(250, (distance / SPEED_PX_PER_SECOND) * 1000)

    const move = (now) => {
      if (state !== 'running' || !taskbar?.visible) return
      const progress = Math.min(1, (now - start) / duration)
      x = startX + (destination - startX) * progress
      setNativePosition()
      if (progress < 1) animationFrame = requestAnimationFrame(move)
      else finishRun()
    }
    animationFrame = requestAnimationFrame(move)
  }, 720)
}

function finishRun() {
  cancelAnimationFrame(animationFrame)
  state = 'arrived'
  animate(frames.arrive)
  setTimeout(() => {
    if (state !== 'arrived' || !taskbar?.visible) return
    state = 'sleeping'
    animate(frames.sleep)
    scheduleAutomaticRun()
  }, 900)
}

cat.addEventListener('click', () => beginRun(true))
window.neko.onTaskbarState(updateTaskbar)
