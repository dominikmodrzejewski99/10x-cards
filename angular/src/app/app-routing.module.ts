import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KitchenSinkComponent } from '../pages/kitchen-sink/kitchen-sink.component';

const routes: Routes = [
  { path: 'kitchen-sink', component: KitchenSinkComponent },
  { path: '', redirectTo: 'kitchen-sink', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { } 