import { Ban, LogOut, Mail, Phone } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function BlockedUserPage() {
  const { signOut, profile } = useAuth()

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-500 rounded-xl flex items-center justify-center">
              <Ban className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            Acesso Bloqueado
          </CardTitle>
          <CardDescription>
            Sua conta foi suspensa temporariamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 text-sm">
              {profile?.full_name ? `${profile.full_name}, seu` : 'Seu'} acesso ao sistema foi bloqueado pelo administrador.
            </p>
          </div>

          <div className="text-center text-muted-foreground text-sm">
            <p>
              Se você acredita que isso seja um engano ou deseja mais informações, entre em contato com o suporte.
            </p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-center text-muted-foreground mb-3">
              Contato do suporte:
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
