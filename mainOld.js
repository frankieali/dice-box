import './style.css'
import DiceBox from './DiceBox/components/diceBox'
import Spheres from './DiceBox/components/spheres'

const box = new DiceBox('#scene-container')
let spheres = null
setTimeout(() => {
  spheres = new Spheres(box.engine,box.scene,500)
}, 1000)