export const buttonBlockPatterns = {
    horizontal: {
        width: '100%',
        height: 70,
        minHeight: 70,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: 8
    },
    vertical: {
        width: '100%',
        height: 200,
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
        maxWidth: '40%',
        height: 'auto',
        flexDirection: 'column',
        padding: 17,
        gap: 17
    },
}

export const cardPatterns = {
    generic: {
        width: '100%',
        height: 'auto',
        padding: 10,
        borderRadius: 8
    },
    nameplate: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 8,
        borderRadius: 10
    }
}

export const buttonPatterns = {
    basic: {
        width: 'auto',
        height: '100%',
        minHeight: 70,
    },
    frame: {
        width: 'auto',
        height: '100%',
        minHeight: 70,
        aspectRatio: 1.7,
        // flexGrow: 1,
    },
    circuit: {
        width: 'auto',
        height: '100%',
        minHeight: 70,
        aspectRatio: 1
    },
    reactor: {
        width: 'auto',
        height: '100%',
        aspectRatio: 1
    },
    text: {
        width: 'auto',
        height: 'auto',
        minHeight: 30,
        maxHeight: 70,
    },
    info: {
        width: 'auto',
        height: 'auto'
    }
}
