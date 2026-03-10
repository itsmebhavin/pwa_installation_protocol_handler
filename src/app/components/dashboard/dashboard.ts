import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InstallPwaService } from '../../services/install-pwa';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  // Inject our new service
  protected installService = inject(InstallPwaService);
}