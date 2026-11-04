import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  CopyIcon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Example, Section } from "#components/section";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Skeleton } from "@repo/ui/components/skeleton";
import { Switch } from "@repo/ui/components/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

export function ComponentsSection() {
  return (
    <Section
      id="componentes"
      title="Componentes"
      description="Componentes de shadcn/ui (Base UI) en packages/ui. Añade más con `aube dlx shadcn@latest add <componente>` desde packages/ui."
    >
      <Example title="Button · variantes">
        <Button>Primario</Button>
        <Button variant="secondary">Secundario</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructivo</Button>
        <Button variant="link">Enlace</Button>
        <Button disabled>Deshabilitado</Button>
      </Example>

      <Example title="Button · tamaños e iconos">
        <Button size="xs">XS</Button>
        <Button size="sm">SM</Button>
        <Button>Default</Button>
        <Button size="lg">LG</Button>
        <Button>
          <ArrowUpRightIcon data-icon="inline-start" />
          Enviar
        </Button>
        <Button variant="outline">
          <ArrowDownLeftIcon data-icon="inline-start" />
          Recibir
        </Button>
        <Button size="icon" variant="outline" aria-label="Añadir">
          <PlusIcon />
        </Button>
      </Example>

      <Example title="Badge">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secundario</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Fallida</Badge>
      </Example>

      <Example title="Formulario">
        <div className="grid w-full max-w-sm gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">Destinatario</Label>
            <Input id="recipient" placeholder="Dirección de Solana" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="amount">Cantidad</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              className="font-mono"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="invalid">Con error</Label>
            <Input
              id="invalid"
              aria-invalid
              defaultValue="dirección-inválida"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch id="priority" />
            <Label htmlFor="priority">Comisión prioritaria</Label>
          </div>
        </div>
      </Example>

      <Example title="Card">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardDescription>Saldo total</CardDescription>
            <CardTitle className="font-mono text-3xl tabular-nums">
              12.4589 SOL
            </CardTitle>
            <CardAction>
              <Badge variant="secondary">+2.4%</Badge>
            </CardAction>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            ≈ 1.874,32 €
          </CardContent>
          <CardFooter className="gap-2">
            <Button className="flex-1">Enviar</Button>
            <Button variant="outline" className="flex-1">
              Recibir
            </Button>
          </CardFooter>
        </Card>
      </Example>

      <Example title="Tabs">
        <Tabs defaultValue="tokens" className="w-full max-w-sm">
          <TabsList>
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="nfts">NFTs</TabsTrigger>
            <TabsTrigger value="activity">Actividad</TabsTrigger>
          </TabsList>
          <TabsContent value="tokens" className="text-muted-foreground">
            Lista de tokens.
          </TabsContent>
          <TabsContent value="nfts" className="text-muted-foreground">
            Colección de NFTs.
          </TabsContent>
          <TabsContent value="activity" className="text-muted-foreground">
            Historial de transacciones.
          </TabsContent>
        </Tabs>
      </Example>

      <Example title="Overlays">
        <Dialog>
          <DialogTrigger render={<Button variant="outline" />}>
            Abrir diálogo
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar envío</DialogTitle>
              <DialogDescription>
                Vas a enviar 1.5 SOL. Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Cancelar
              </DialogClose>
              <DialogClose render={<Button />}>Confirmar</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" />}>
            Menú
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Cuenta</DropdownMenuLabel>
            <DropdownMenuItem>Copiar dirección</DropdownMenuItem>
            <DropdownMenuItem>Ver en el explorador</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              Desconectar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger
            render={<Button variant="ghost" size="icon" aria-label="Copiar" />}
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipContent>Copiar dirección</TooltipContent>
        </Tooltip>

        <Button
          variant="outline"
          onClick={() => toast.success("Transacción confirmada")}
        >
          Mostrar toast
        </Button>
      </Example>

      <Example title="Skeleton">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </Example>
    </Section>
  );
}
