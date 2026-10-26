import { AppNotification } from '../models/notification.model';

/**
 * Texto de una notificación. Vive aparte de los componentes porque el mismo mensaje se usa
 * en la campana y en el toast, y ninguno de los dos debería tener su propia versión.
 */
export function notificationText(notification: AppNotification): string {
  const who = notification.actor?.displayName ?? 'Alguien';
  const card = notification.cardTitle ?? 'una tarjeta';
  const workspace = notification.workspaceName ?? 'un espacio';

  switch (notification.type) {
    case 'CardAssigned':
      return `${who} te asignó «${card}»`;
    case 'CardUnassigned':
      return `${who} te quitó de «${card}»`;
    case 'CommentOnCard':
      return `${who} comentó en «${card}»`;
    case 'DueDateChanged':
      return `${who} cambió la fecha límite de «${card}»`;
    case 'WorkspaceInvitation':
      return `${who} te invitó a ${workspace}`;
    case 'InvitationAccepted':
      return `${who} se unió a ${workspace}`;
    case 'RoleChanged':
      return `${who} te cambió el rol en ${workspace} a ${roleLabel(notification.detail)}`;
    case 'RemovedFromWorkspace':
      return `${who} te quitó de ${workspace}`;
  }
}

function roleLabel(role: string | null): string {
  switch (role) {
    case 'Owner':
      return 'Owner';
    case 'Admin':
      return 'Admin';
    case 'Member':
      return 'Member';
    default:
      return 'otro rol';
  }
}
