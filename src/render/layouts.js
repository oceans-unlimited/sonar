export const buttonBlockPatterns = {
    horizontal: {
        width: '100%',
        height: 'auto',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 20
    },
    vertical: {
        width: 'auto',
        height: 'auto',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'stretch',
        gap: 12
    }
}

export const panelPatterns = {
    control: {
        width: 'auto',
        minWidth: '275',
        height: 'auto',
        flexDirection: 'column',
        padding: 17,
        gap: 25
    },
}

export const cardPatterns = {
    generic: {
        isLeaf: true,
        width: '100%',
        height: 'auto',
        padding: 10,
        borderRadius: 8
    },
    nameplate: {
        isLeaf: true,
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 8,
        borderRadius: 10
    }
}
