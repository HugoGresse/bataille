import { CountryInfo } from '../../../../server/model/types/CountryInfo'
import { BatailleScene } from './BatailleScene'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'

const textStyle = {
    ...TEXT_STYLE,
    color: '#000000',
    fontStyle: 'bold',
    fontSize: '20px',
}
const textStyleLocalName = {
    ...TEXT_STYLE,
    color: '#000000',
    fontSize: '20px',
}
export const displayCountriesInfo = (countriesInfos: CountryInfo[], scene: BatailleScene) => {
    countriesInfos.forEach((info) => {
        let textToDisplay = `${info.name} (+${info.income})`
        const text = scene.add.text(info.x, info.y, textToDisplay, textStyle)
        text.setOrigin(text.width / 200, 0)
        if (info.localName) {
            const text2 = scene.add.text(info.x, info.y + text.height + 5, `${info.localName}`, textStyleLocalName)
            text2.setOrigin(text.originX, text.originY)
        }
    })
}
