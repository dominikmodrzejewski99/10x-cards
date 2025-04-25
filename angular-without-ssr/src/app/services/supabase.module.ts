import { NgModule } from '@angular/core';
import { SupabaseClientFactory } from './supabase-client.factory';

@NgModule({
  providers: [
    SupabaseClientFactory
  ]
})
export class SupabaseModule { }
