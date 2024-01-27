export function promisify(f) {
  return function (...args) {
    // возвращает функцию-обёртку
    return new Promise((resolve, reject) => {
      function callback(err, result) {
        // наш специальный колбэк для f
        if (err) {
          reject(err)
        } else {
          resolve(result)
        }
      }

      args.push(callback) // добавляем колбэк в конец аргументов f

      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      f.call(this, ...args) // вызываем оригинальную функцию
    })
  }
}

// module.exports = {
//   promisify() {
//     console.log('promisify')
//   },
// }
