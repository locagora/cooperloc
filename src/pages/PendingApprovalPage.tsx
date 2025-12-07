import { Clock, LogOut, Mail, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function PendingApprovalPage() {
  const { signOut, profile } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-amber-500 rounded-xl flex items-center justify-center animate-pulse">
              <Clock className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-amber-600">
            Cadastro Pendente
          </CardTitle>
          <CardDescription>
            Seu cadastro está aguardando aprovação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
            <p className="text-amber-800 text-sm">
              Olá{profile?.full_name ? `, ${profile.full_name}` : ''}! Seu cadastro foi recebido com sucesso e está sendo analisado pela equipe administrativa.
            </p>
          </div>

          <div className="text-center text-muted-foreground text-sm space-y-2">
            <p>
              Você receberá uma notificação por e-mail assim que seu acesso for liberado.
            </p>
            <p>
              Este processo geralmente leva até 24 horas úteis.
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Em caso de dúvidas, entre em contato:
            </p>
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" />
                <span>suporte@cooperloc.com.br</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>(11) 99999-9999</span>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair da Conta
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
