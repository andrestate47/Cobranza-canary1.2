import html2canvas from "html2canvas"

/**
 * Captura un elemento como canvas creando un clon fuera de pantalla (off-screen)
 * sin modificar el DOM visible para evitar saltos o descuadres visuales.
 */
export async function captureBoletaAsCanvas(
  element: HTMLElement,
  options?: Partial<Parameters<typeof html2canvas>[1]>
): Promise<HTMLCanvasElement> {
  // Crear contenedor invisible fuera de pantalla
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.left = "-9999px"
  container.style.top = "-9999px"
  container.style.width = "800px"
  container.style.opacity = "0"
  container.style.pointerEvents = "none"
  container.style.zIndex = "-9999"

  // Clonar el elemento
  const clone = element.cloneNode(true) as HTMLElement

  // Asegurar que el clon tenga zoom 1 y dimensiones originales de 800px
  // @ts-ignore
  clone.style.zoom = "1"
  clone.style.transform = "none"
  clone.style.width = "800px"
  clone.style.margin = "0"

  // Remover zoom en cualquier hijo clonado
  const allClonedElements = clone.querySelectorAll<HTMLElement>("*")
  allClonedElements.forEach((el) => {
    // @ts-ignore
    if (el.style && el.style.zoom) {
      // @ts-ignore
      el.style.zoom = "1"
    }
  })

  container.appendChild(clone)
  document.body.appendChild(container)

  // Breve espera para asegurar renderizado del DOM en el contenedor
  await new Promise((resolve) => setTimeout(resolve, 30))

  try {
    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
      width: 800,
      windowWidth: 800,
      ...options,
    })
    return canvas
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container)
    }
  }
}

