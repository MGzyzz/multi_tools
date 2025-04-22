import multiprocessing


def square_sum(numbers):
    return sum(x * x for x in numbers)



if __name__ == '__main__':
    numbers = range(1 , 1000000)
    pool = multiprocessing.Pool()
    result = pool.apply(square_sum , (numbers,))
    print(result)