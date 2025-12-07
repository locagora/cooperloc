import { Link } from 'react-router-dom'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">Acesso Negado</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema.
          </p>
        </CardContent>
        <CardFooter>
          <Link to="/dashboard" className="w-full">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para o Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
