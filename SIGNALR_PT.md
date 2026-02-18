# Documentação da Implementação do SignalR

O **Scrum Trello** utiliza o **SignalR** para fornecer atualizações em tempo real entre todos os usuários que estão visualizando o mesmo quadro. Isso garante que, quando um usuário move um cartão, cria uma tarefa ou convida um membro, todos os outros veem a mudança instantaneamente sem precisar recarregar a página.

Este documento explica como a arquitetura foi montada, desde o Backend até o Frontend.

---

## 🏗️ Arquitetura Backend (.NET)

O Backend gerencia as conexões WebSocket e agrupa os usuários por quadro ("Board Groups").

### 1. Hub Central (`BoardHub.cs`)
O arquivo `Hubs/BoardHub.cs` é o ponto central de conexão. Ele define os métodos que o Frontend pode chamar para entrar ou sair de um quadro.

```csharp
public class BoardHub : Hub
{
    // O Frontend chama este método ao abrir um quadro
    public async Task JoinBoard(string boardId)
    {
        // Adiciona a conexão do usuário ao grupo específico daquele quadro
        await Groups.AddToGroupAsync(Context.ConnectionId, $"board_{boardId}");
    }

    // O Frontend chama este método ao sair do quadro
    public async Task LeaveBoard(string boardId)
    {
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"board_{boardId}");
    }
}
```

### 2. Disparo de Eventos (Controllers)
Os controladores (`TasksController`, `BoardsController`) injetam o `IHubContext<BoardHub>` para enviar mensagens aos grupos quando algo muda no banco de dados.

**Exemplo: Movendo uma Tarefa (`TasksController.cs`)**
Quando uma tarefa é movida, o backend notifica todos no grupo `board_{boardId}`:

```csharp
[HttpPut("{id}/move")]
public async Task<IActionResult> MoveTask(...)
{
    // ... lógica de negócio para salvar no banco ...

    // Envia evento 'TaskMoved' para todos no grupo do quadro
    await _hubContext.Clients.Group($"board_{task.BoardId}")
        .SendAsync("TaskMoved", new TaskCardDto { ... });

    return Ok();
}
```

**Principais Eventos Emitidos:**
-   `TaskCreated`: Nova tarefa criada.
-   `TaskMoved`: Tarefa mudou de coluna ou posição.
-   `TaskDeleted`: Tarefa removida.
-   `TaskUpdated`: Conteúdo da tarefa editado.
-   `MemberJoined`: Novo membro aceitou convite.
-   `MemberRemoved`: Membro removido do quadro.

---

## 💻 Implementação Frontend (React)

O Frontend mantém uma conexão persistente com o Hub e escuta os eventos enviados pelo servidor.

### 1. Hook Personalizado (`useSignalR.ts`)
Criamos um hook reutilizável `useSignalR` que gerencia o ciclo de vida da conexão.

-   **Conexão Automática:** Ao montar o componente, ele conecta ao `http://localhost:5145/hubs/board`.
-   **Autenticação:** Envia o token JWT automaticamente para validar o usuário.
-   **Join/Leave:** Chama `JoinBoard` ao entrar na página e `LeaveBoard` ao sair.
-   **Reconexão:** Tenta reconectar automaticamente se a internet cair.

```typescript
// Exemplo simplificado do uso no BoardPage.tsx
useSignalR(boardId, {
    onTaskMoved: (task) => {
        // Atualiza o estado local do React para mover o cartão visualmente
        handleTaskMoveInternal(task);
    },
    onTaskCreated: (task) => {
        // Adiciona a nova tarefa na coluna correta
        addTaskToColumn(task);
    },
    // ... outros callbacks
});
```

### 2. Atualizações Otimistas vs. Real-Time
Para garantir a melhor experiência:
1.  **Usuário que faz a ação:** Vê a mudança **imediatamente** (interface otimista) antes mesmo do servidor responder.
2.  **Outros usuários:** Recebem o evento do SignalR milissegundos depois e suas telas são atualizadas.

---

## 🔄 Fluxo Completo de uma Ação

1.  **Usuário A** arrasta um cartão de "To Do" para "Done".
2.  Frontend do **Usuário A** atualiza a UI imediatamente (sem esperar o servidor).
3.  Frontend envia requisição `PUT /api/tasks/{id}/move` para o Backend.
4.  **Backend** salva a nova posição no Banco de Dados (PostgreSQL).
5.  **Backend** usa o `BoardHub` para enviar o evento `TaskMoved` para o grupo `board_1`.
6.  **Usuário B** (que está no mesmo quadro) recebe o evento `TaskMoved` via WebSocket.
7.  O Frontend do **Usuário B** executa `onTaskMoved` e o cartão se move na tela dele "sozinho".

Isso garante que todos vejam sempre a mesma versão do quadro, como se estivessem trabalhando fisicamente no mesmo lugar.
