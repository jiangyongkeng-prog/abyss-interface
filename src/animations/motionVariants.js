export const fadeUp = {
    hidden: {
        opacity: 0,
        y: 36,
    },
    show: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.75,
            ease: 'easeOut',
        },
    },
}

export const staggerGroup = {
    hidden: {},
    show: {
        transition: {
            staggerChildren: 0.16,
        },
    },
}