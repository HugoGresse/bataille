export const parseKeyCode = (keyCode: string): number | null => {
    try {
        return parseInt(keyCode);
    } catch(e) {
        console.error(e);
        return null;
    }
}
