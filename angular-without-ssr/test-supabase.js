const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
);

async function testSupabase() {
  try {
    // Test connection by listing tables
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .limit(5);

    if (error) {
      console.error('Error connecting to Supabase:', error);
    } else {
      console.log('Successfully connected to Supabase!');
      console.log('Sample data:', data);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSupabase();
