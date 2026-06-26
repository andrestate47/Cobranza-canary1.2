import html2canvas from "html2canvas"

/**
 * Captura un elemento como canvas, temporalmente removiendo cualquier CSS zoom
 * que pueda distorsionar el renderizado de html2canvas.
 */
export async function captureBoletaAsCanvas(
  element: HTMLElement,
  options?: Partial<Parameters<typeof html2canvas>[1]>
): Promise<HTMLCanvasElement> {
  // Find the closest ancestor (or self) that has CSS zoom applied
  const zoomedElements: { el: HTMLElement; originalZoom: string }[] = []
  
  let current: HTMLElement | null = element
  while (current) {
    // @ts-ignore - zoom is non-standard but works in most browsers
    const computedZoom = (current.style as any).zoom
    if (computedZoom && computedZoom !== '1' && computedZoom !== '' && computedZoom !== 'normal') {
      zoomedElements.push({ el: current, originalZoom: computedZoom })
      // @ts-ignore
      ;(current.style as any).zoom = '1'
    }
    current = current.parentElement
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      useCORS: true,
      width: 800,
      windowWidth: 800,
      ...options,
    })
    return canvas
  } finally {
    // Restore zoom values
    for (const { el, originalZoom } of zoomedElements) {
      // @ts-ignore
      ;(el.style as any).zoom = originalZoom
    }
  }
}
