'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
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
    <Button type="submit" aria-disabled={pending} className="w-full text-base">
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
  const [state, formAction] = useActionState(submitSongAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message) {
      if (state.errors && Object.keys(state.errors).length > 0) {
        // Validation errors are displayed inline
      } else if (state.message.includes('Succès')) {
        toast({
          title: 'Cool!',
          description: state.message,
        });
        formRef.current?.reset();
      } else {
        // Other errors (like duplicate song)
        toast({
          title: 'Oups!',
          description: state.message,
          variant: 'destructive',
        });
      }
    }
  }, [state, toast]);

  return (
    <Card className="w-full sticky top-8 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-4xl font-bold font-headline">Propose un son</CardTitle>
        <CardDescription className="text-2xl">Ajoute ton titre préféré à la compétition</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="artist" className="text-2xl">Artiste</Label>
            <Input id="artist" name="artist" placeholder="Ex: Daft Punk" required className="text-xl md:text-base"/>
            {state.errors?.artist && <p className="text-sm font-medium text-destructive">{state.errors.artist[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title" className="text-2xl">Titre</Label>
            <Input id="title" name="title" placeholder="Ex: One More Time" required className="text-xl md:text-base"/>
            {state.errors?.title && <p className="text-sm font-medium text-destructive">{state.errors.title[0]}</p>}
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  );
}
