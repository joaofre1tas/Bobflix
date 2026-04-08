import { useLocation, Link } from 'react-router-dom'
import { useEffect } from 'react'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="flex-1 flex items-center justify-center bg-bg text-text-primary p-6 animate-fade-in">
      <div className="text-center space-y-6 max-w-md mx-auto">
        <h1 className="text-8xl font-bold text-bobflix-500 tracking-tighter">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold">Página não encontrada</h2>
          <p className="text-text-secondary">
            Ops! Parece que o vídeo pausou. A sala ou página que você está procurando não existe ou
            foi removida.
          </p>
        </div>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-block w-full sm:w-auto rounded-full bg-text-primary hover:bg-black text-white font-medium px-8 py-3.5 transition-colors shadow-subtle hover:shadow-elevation"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  )
}

export default NotFound
