import axios from "axios";



export const getDetailGroup = async (id) => {
    try {
        const response = await axios.get(`http://localhost:8000/api/get_detail_group/${id}`);
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}

// TO-DO надо сделать возвращение группы и студентов так же предметов текущей группы по времени

// TO-DO когда человек заходит на страницу то если будет отсутствовать аттенденс то на бэк-энд отправляется запрос на создание аттенденса с дефолтными значениями absent 