import { NextPageContext } from 'next'

interface ErrorProps {
  statusCode?: number
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', fontFamily: 'sans-serif' }}>
      <h1>{statusCode ? `Error ${statusCode}` : 'Error del cliente'}</h1>
      <p>Ocurrió un error en el servidor. Por favor recarga la página.</p>
    </div>
  )
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default ErrorPage
