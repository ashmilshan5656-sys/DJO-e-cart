import axios from 'axios'

const API = axios.create({
    baseURL: 'https://ashmil.pythonanywhere.com/api/',
})

export default API