const d = new Date()
// d.getTime() es UTC. Le restamos 5 horas para obtener el tiempo de Ecuador
const ecuadorTime = d.getTime() - (5 * 60 * 60 * 1000)
const ecuadorDate = new Date(ecuadorTime)
console.log("Local time:", d.toString())
console.log("Ecuador calculated ISO date string:", ecuadorDate.toISOString())
console.log("Final date:", ecuadorDate.toISOString().split('T')[0])
