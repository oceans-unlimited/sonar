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
    },
    stack: {
        width: '100%',
        height: 'auto',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'stretch',
        gap: 8
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
    fixed: {
        width: 680,
        height: 460,
        flexDirection: 'column',
        padding: 17,
        gap: 17
    },
    engine: {
        width: 'auto',
        minWidth: 500,
        maxWidth: '75%',
        height: 'auto',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 17,
        gap: 17
    },
    lobby: {
        maxWidth: '33%',
        minWidth: '15%',
        height: 'auto',
        padding: 15,
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'flex-start'
    }
}

export const cardPatterns = {
    generic: {
        width: '100%',
        height: 'auto',
        padding: 10,
        borderRadius: 8
    },
    nameplate: {
        width: 200,
        height: 60,
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 0,
        gap: 0,
        borderRadius: 12
    }
}

export const tagPatterns = {
    circuit: {
        position: 'absolute',
        right: 3,
        bottom: 3
    },
    reactor: {
        position: 'absolute',
        right: 4,
        bottom: 0
    }
}

export const buttonPatterns = {
    basic: {
        // width: 'auto',
        // height: '100%',
        // minHeight: 70,
    },
    frame: {
        width: 'auto',
        height: '100%',
        maxHeight: 70,
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
        width: 50,
        height: '100%',
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
