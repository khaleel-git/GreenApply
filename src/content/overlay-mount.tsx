import { createRoot } from 'react-dom/client'
import { Overlay } from '../overlay/Overlay'

export function mountOverlay(shadow: ShadowRoot): void {
  const container = document.createElement('div')
  container.id = 'greenapply-overlay-root'
  shadow.appendChild(container)
  const root = createRoot(container)
  root.render(<Overlay />)
}
