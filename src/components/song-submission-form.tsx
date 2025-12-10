'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import { submitSongAction, type FormState } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowIcon } from '@/components/ui/arrow-icon';
import { useLanguage } from '@/context/language-context';
import { Lock } from 'lucide-react';

const initialState: FormState = {
  message: '',
  errors: {},
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  const { t } = useLanguage();
  const isDisabled = pending || disabled;

  return (
    <Button type="submit" aria-disabled={isDisabled} disabled={isDisabled} className="w-full text-base">
      {isDisabled && !pending ? (
        <>
          <Lock className="h-4 w-4" />
          {t('submission_closed_button')}
        </>
      ) : pending ? (
        t('submission_pending')
      ) : (
        <>
          {t('submission_button')}
          <ArrowIcon className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

export function SongSubmissionForm() {
  const { t } = useLanguage();
  const [state, formAction] = useActionState(submitSongAction, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmissionLocked, setIsSubmissionLocked] = useState(false);

  useEffect(() => {
    const now = new Date();
    const day = now.getDay(); // Sunday: 0, Monday: 1, ..., Thursday: 4, ...
    
    // Submissions are locked from Thursday (4) until the next cycle starts on Tuesday (2) afternoon.
    if (day >= 4 || day < 2 || (day === 2 && now.getHours() < 18)) {
        setIsSubmissionLocked(true);
    } else {
        setIsSubmissionLocked(false);
    }
  }, []);

  useEffect(() => {
    if (state.message) {
      if (state.errors?.general) {
        // The ban message is displayed directly in the form
      } else if (state.errors && (state.errors.artist || state.errors.title)) {
        // Validation errors are displayed inline
      } else if (state.message.includes('succès') || state.message.includes('successfully')) {
        toast({
          title: t('toast_success_title'),
          description: state.message,
        });
        formRef.current?.reset();
      } else {
        // Other errors (duplicate song, non-banned inappropriate terms, etc.)
        toast({
          title: t('toast_oops_title'),
          description: state.message,
          variant: 'destructive',
        });
      }
    }
  }, [state, toast, t]);

  return (
    <Card className="w-full sticky top-24 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-4xl font-bold font-headline">{t('submission_title')}</CardTitle>
        <CardDescription className="text-2xl">{isSubmissionLocked ? t('submission_description_locked') : t('submission_description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <fieldset disabled={isSubmissionLocked}>
            <div className="hidden" aria-hidden="true">
                <label htmlFor="honeypot-submit">{t('honeypot_label')}</label>
                <input type="text" id="honeypot-submit" name="honeypot" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="artist" className="text-2xl">{t('artist_label')}</Label>
              <Input id="artist" name="artist" placeholder={t('artist_placeholder')} required className="text-xl md:text-base"/>
              {state.errors?.artist && <p className="text-sm font-medium text-destructive">{state.errors.artist[0]}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="title" className="text-2xl">{t('title_label')}</Label>
              <Input id="title" name="title" placeholder={t('title_placeholder')} required className="text-xl md:text-base"/>
              {state.errors?.title && <p className="text-sm font-medium text-destructive">{state.errors.title[0]}</p>}
            </div>
          </fieldset>
          {state.errors?.general && (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive rounded-md">
              <p className="font-bold text-center">{state.errors.general[0]}</p>
            </div>
          )}
          <SubmitButton disabled={isSubmissionLocked} />
        </form>
      </CardContent>
    </Card>
  );
}
