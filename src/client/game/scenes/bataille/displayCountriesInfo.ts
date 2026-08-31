import { CountryInfo } from '../../../../server/model/types/CountryInfo'
import { BatailleScene } from './BatailleScene'
import { TEXT_STYLE } from '../../../utils/TEXT_STYLE'
import { DEPTH_MAP_LABEL } from '../depth'

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
        text.setDepth(DEPTH_MAP_LABEL)
        if (info.localName) {
            const text2 = scene.add.text(info.x, info.y + text.height - 5, `${info.localName}`, textStyleLocalName)
            text2.setOrigin(text.originX, 0)
            text2.width = text.width
            text2.setDepth(DEPTH_MAP_LABEL)
        }
    })
}
