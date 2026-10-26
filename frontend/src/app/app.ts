import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmHost } from './shared/components/confirm-host/confirm-host';
import { ToastStack } from './shared/components/toast-stack/toast-stack';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastStack, ConfirmHost],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
