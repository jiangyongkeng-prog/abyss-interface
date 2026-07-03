export function handleCardSpotlight(event) {
    const card = event.currentTarget
    const rect = card.getBoundingClientRect()

    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    card.style.setProperty('--spotlight-x', `${x}px`)
    card.style.setProperty('--spotlight-y', `${y}px`)
}