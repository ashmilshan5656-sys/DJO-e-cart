import axios from 'axios'

const API = axios.create({
    baseURL: 'https://ashmil.pythonanywhere.com/api/',
    headers: {
        'Content-Type': 'application/json',
    },
})

export default API