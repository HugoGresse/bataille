import {createTheme} from '@material-ui/core'

export const theme = createTheme({
    palette: {
        primary: {
            dark: "#512DA8",
            main: '#673AB7',
            light: "#D1C4E9"
        },
        secondary: {
            main: '#FF5722',
        },
        divider: "#BDBDBD",
        text: {
            primary: "#FFFFFF",
            secondary: "#757575",

        },
        mode: 'dark'
    },
});
