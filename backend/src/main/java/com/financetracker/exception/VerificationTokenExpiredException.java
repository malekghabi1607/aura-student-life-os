package com.financetracker.exception;

public class VerificationTokenExpiredException extends BadRequestException {
    public VerificationTokenExpiredException() {
        super("Lien de vérification expiré. Demandez un nouveau lien.");
    }
}
