'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useEffect, useRef } from 'react';
import { submitSongAction, type FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowIcon } from '@/components/ui/arrow-icon';

const initialState: FormState = {
  message: '',
  errors: {},
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" aria-disabled={pending} className="w-full">
      {pending ? 'Soumission...' : (
        <>
          Proposer le son
          <ArrowIcon className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function SongSubmissionForm() {
  const [state, formAction] = useFormState(submitSongAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        // Validation errors are displayed inline
      } else if (state.message.includes('succès')) {
        toast({
          title: 'Cool!',
          description: state.message,
        });
        formRef.current?.reset();
      } else {
        // Other errors (like duplicate song)
        toast({
          title: 'Oups...',
          description: state.message,
          variant: 'destructive',
        });
      }
    }
  }, [state, toast]);

  return (
    <Card className="w-full sticky top-8 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Propose un son</CardTitle>
        <CardDescription>Ajoute ton titre préféré à la compétition.</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artist">Artiste</Label>
            <Input id="artist" name="artist" placeholder="Ex: Daft Punk" required />
            {state.errors?.artist && <p className="text-sm font-medium text-destructive">{state.errors.artist[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" name="title" placeholder="Ex: One More Time" required />
            {state.errors?.title && <p className="text-sm font-medium text-destructive">{state.errors.title[0]}</p>}
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
