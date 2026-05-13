const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000

// Endpoint principal
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Pipeline CI/CD funcionando',
        env: 'dev'
    })
})

// Smoke test endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' })
})

app.listen(PORT, () => {
    console.log(`Server on port ${PORT}`)
})

module.exports = app