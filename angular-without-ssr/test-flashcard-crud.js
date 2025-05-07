const { createClient } = require('@supabase/supabase-js');

// Create a Supabase client
const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'
);

async function testFlashcardCRUD() {
  try {
    console.log('Testing Flashcard CRUD operations...');

    // Create a test user first
    console.log('0. Creating a test user...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: '00000000-0000-0000-0000-000000000000',
          email: 'test@example.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (userError) {
      console.error('Error creating user:', userError);
      // If the user already exists, we can continue
      console.log('Continuing with existing user...');
    } else {
      console.log('User created successfully:', userData);
    }

    // Create a test flashcard
    console.log('\n1. Creating a test flashcard...');
    const { data: createData, error: createError } = await supabase
      .from('flashcards')
      .insert([
        {
          front: 'Test Front',
          back: 'Test Back',
          source: 'manual',
          user_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (createError) {
      console.error('Error creating flashcard:', createError);
      return;
    }

    console.log('Flashcard created successfully:', createData);
    const flashcardId = createData[0].id;

    // Read the flashcard
    console.log('\n2. Reading the flashcard...');
    const { data: readData, error: readError } = await supabase
      .from('flashcards')
      .select('*')
      .eq('id', flashcardId)
      .single();

    if (readError) {
      console.error('Error reading flashcard:', readError);
      return;
    }

    console.log('Flashcard read successfully:', readData);

    // Update the flashcard
    console.log('\n3. Updating the flashcard...');
    const { data: updateData, error: updateError } = await supabase
      .from('flashcards')
      .update({
        front: 'Updated Front',
        back: 'Updated Back',
        updated_at: new Date().toISOString()
      })
      .eq('id', flashcardId)
      .select();

    if (updateError) {
      console.error('Error updating flashcard:', updateError);
      return;
    }

    console.log('Flashcard updated successfully:', updateData);

    // Delete the flashcard
    console.log('\n4. Deleting the flashcard...');
    const { error: deleteError } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId);

    if (deleteError) {
      console.error('Error deleting flashcard:', deleteError);
      return;
    }

    console.log('Flashcard deleted successfully!');
    console.log('\nAll CRUD operations completed successfully!');
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testFlashcardCRUD();
