import api from "./api";



export const getDetailGroup = async (id) => {
    try {
        const response = await api.get(`/api/get_detail_group/${id}/`);
        return response.data
    } catch (error) {
        console.error('Error fetching students list:', error);
        throw error;
    }
}

// TO-DO надо сделать возвращение группы и студентов так же предметов текущей группы по времени

// TO-DO когда человек заходит на страницу то если будет отсутствовать аттенденс то на бэк-энд отправляется запрос на создание аттенденса с дефолтными значениями absent 