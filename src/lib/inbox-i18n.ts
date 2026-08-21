import {
    type AppLanguage,
  } from "@/lib/i18n";
  
  /* =========================================================
     INBOX COPY
  ========================================================= */
  
  export const inboxCopy = {
    en: {
      page: {
        eyebrow:
          "Communication",
  
        title:
          "Inbox",
  
        description:
          "Lead emails and replies synchronized from Gmail.",
  
        emptyTrash:
          "Empty trash",
  
        syncOne:
          "1 new message synced.",
  
        syncMany:
          "{count} new messages synced.",
  
        upToDate:
          "Inbox is up to date.",
  
        replySent:
          "Reply sent successfully.",
  
        gmailReadRequired:
          "Gmail read access is required.",
  
        syncFailed:
          "Gmail sync failed. Check the development terminal for details.",
  
        inbox:
          "Inbox",
  
        archived:
          "Archived",
  
        trash:
          "Trash",
  
        searchInbox:
          "Search inbox...",
  
        searchArchived:
          "Search archived...",
  
        searchTrash:
          "Search trash...",
  
        noArchived:
          "No archived conversations",
  
        trashEmpty:
          "Trash is empty",
  
        noConversations:
          "No lead conversations yet",
  
        message:
          "message",
  
        messages:
          "messages",
  
        replyReceived:
          "Reply received",
  
        emailSent:
          "Email sent",
  
        markAsRead:
          "Mark as read",
  
        read:
          "Read",
  
        markAsUnread:
          "Mark as unread",
  
        unread:
          "Unread",
  
        archive:
          "Archive",
  
        restore:
          "Restore",
  
        moveToTrash:
          "Move to trash",
  
        deletePermanently:
          "Delete permanently",
  
        openLead:
          "Open lead",
  
        noConversationSelected:
          "No conversation selected",
  
        subject:
          "Subject",
  
        attachments:
          "Attachments",
  
        downloadAttachment:
          "Download attachment",
  
        unknownCompany:
          "Unknown company",
  
        companyInbox:
          "Company inbox",
  
        outreach:
          "Outreach",
  
        email:
          "Email",
      },
  
      list: {
        deleteConfirmOne:
          "Delete 1 thread permanently? This cannot be undone.",
  
        deleteConfirmMany:
          "Delete {count} threads permanently? This cannot be undone.",
  
        archiving:
          "Archiving {count}...",
  
        restoring:
          "Restoring {count}...",
  
        deleting:
          "Deleting {count}...",
  
        movingToTrash:
          "Moving {count} to trash...",
  
        archivedOne:
          "1 thread archived.",
  
        archivedMany:
          "{count} threads archived.",
  
        restoredOne:
          "1 thread restored.",
  
        restoredMany:
          "{count} threads restored.",
  
        deletedOne:
          "1 thread deleted permanently.",
  
        deletedMany:
          "{count} threads deleted permanently.",
  
        trashedOne:
          "1 thread moved to trash.",
  
        trashedMany:
          "{count} threads moved to trash.",
  
        updateFailed:
          "The selected threads could not be updated.",
  
        archivingSingle:
          "Archiving...",
  
        threadArchived:
          "Thread archived.",
  
        archiveFailed:
          "Thread could not be archived.",
  
        noConversations:
          "No conversations here",
  
        folderEmpty:
          "This folder is currently empty.",
  
        swipeToArchive:
          "Swipe right to archive",
  
        selectForActions:
          "Select threads for actions",
  
        select:
          "Select",
  
        cancelSelection:
          "Cancel selection",
  
        selected:
          "selected",
  
        clear:
          "Clear",
  
        all:
          "All",
  
        archiveSelected:
          "Archive selected",
  
        restoreSelected:
          "Restore selected",
  
        restoreSelectedToInbox:
          "Restore selected to inbox",
  
        deleteSelected:
          "Delete selected",
  
        deleteSelectedPermanently:
          "Delete selected permanently",
  
        moveSelectedToTrash:
          "Move selected to trash",
  
        archive:
          "Archive",
  
        replied:
          "Replied",
  
        sent:
          "Sent",
  
        new:
          "new",
      },
  
      sync: {
        syncing:
          "Syncing...",
  
        sync:
          "Sync",
      },
  
      composer: {
        serverError:
          "The server could not process the request.",
  
        fileReadFailed:
          "{name} could not be read.",
  
        fileEncodeFailed:
          "{name} could not be encoded.",
  
        draftRestoredAttachments:
          "Draft restored. Please re-add the attachments before sending.",
  
        scheduledAttachmentsPreserved:
          "Existing scheduled attachments are preserved. Cancel and create a new schedule if you need to change the attachments.",
  
        maxAttachments:
          "You can attach up to {count} files.",
  
        fileTooLarge:
          "{name} is larger than 8 MB.",
  
        totalTooLarge:
          "Attachments may be up to 12 MB in total.",
  
        replaceWithAi:
          "Replace your current reply with an AI-generated draft?",
  
        generationFailed:
          "Reply generation failed.",
  
        discardDraftConfirm:
          "Discard this saved draft?",
  
        writeMessageFirst:
          "Write a message first.",
  
        replyCouldNotBeSent:
          "Reply could not be sent.",
  
        replyCouldNotBeScheduled:
          "Reply could not be scheduled.",
  
        validDate:
          "Choose a valid date and time.",
  
        scheduledReplyUpdateFailed:
          "Scheduled reply could not be updated.",
  
        cancelScheduledConfirm:
          "Cancel this scheduled reply? It will not be sent.",
  
        scheduledReplyCancelFailed:
          "Scheduled reply could not be cancelled.",
  
        tomorrowCalculationFailed:
          "Could not calculate tomorrow morning.",
  
        loadingReplyStatus:
          "Loading reply status...",
  
        replyScheduled:
          "Reply scheduled",
  
        scheduledFor:
          "Scheduled for",
  
        edit:
          "Edit",
  
        cancel:
          "Cancel",
  
        attachment:
          "attachment",
  
        attachments:
          "attachments",
  
        included:
          "included",
  
        scheduledReplyCancelled:
          "Scheduled reply cancelled",
  
        cancelledByReply:
          "The scheduled reply was cancelled automatically because the lead replied before it was sent.",
  
        cancelledNormally:
          "The scheduled reply was cancelled and will not be sent.",
  
        writeReply:
          "Write reply",
  
        scheduledReplyFailed:
          "Scheduled reply failed",
  
        scheduledReplyCouldNotBeSent:
          "The scheduled reply could not be sent.",
  
        editReschedule:
          "Edit & reschedule",
  
        draftSaved:
          "Draft saved",
  
        draftSavedDescription:
          "Your reply is saved automatically and will be restored when you return to this thread.",
  
        continueDraft:
          "Continue draft",
  
        discard:
          "Discard",
  
        reply:
          "Reply",
  
        replySent:
          "Reply sent successfully.",
  
        replyDirectlyTo:
          "Reply directly to",
  
        editScheduledReply:
          "Edit scheduled reply",
  
        updateScheduledMessage:
          "Update the message or scheduled send time.",
  
        draftSavedAutomatically:
          "Draft saved automatically",
  
        replyingLatestThread:
          "Replying in the latest Gmail thread",
  
        close:
          "Close",
  
        to:
          "To",
  
        generatingReply:
          "Generating reply...",
  
        writeYourReply:
          "Write your reply...",
  
        total:
          "total",
  
        existingAttachments:
          "Existing attachments",
  
        existingAttachmentsDescription:
          "Existing attachments are preserved when editing. Cancel and create a new scheduled reply to change them.",
  
        scheduledSendTime:
          "Scheduled send time",
  
        scheduleReply:
          "Schedule reply",
  
        timeZone:
          "Time zone",
  
        schedule:
          "Schedule",
  
        attachmentsPreserved:
          "Attachments are preserved while editing",
  
        attachFiles:
          "Attach files",
  
        generating:
          "Generating...",
  
        generateReply:
          "Generate reply",
  
        discardChanges:
          "Discard changes",
  
        saveChanges:
          "Save changes",
  
        discardDraft:
          "Discard draft",
  
        sending:
          "Sending...",
  
        sendReply:
          "Send reply",
  
        scheduleSend:
          "Schedule send",
  
        sendLater:
          "Send later",
  
        laterToday:
          "Later today",
  
        tomorrowMorning:
          "Tomorrow morning",
  
        customDateTime:
          "Custom date & time",
  
        chooseSendTime:
          "Choose exactly when to send",
      },
    },
  
    de: {
      page: {
        eyebrow:
          "Kommunikation",
  
        title:
          "Posteingang",
  
        description:
          "Lead-E-Mails und Antworten, die mit Gmail synchronisiert werden.",
  
        emptyTrash:
          "Papierkorb leeren",
  
        syncOne:
          "1 neue Nachricht synchronisiert.",
  
        syncMany:
          "{count} neue Nachrichten synchronisiert.",
  
        upToDate:
          "Der Posteingang ist aktuell.",
  
        replySent:
          "Antwort erfolgreich gesendet.",
  
        gmailReadRequired:
          "Gmail-Lesezugriff ist erforderlich.",
  
        syncFailed:
          "Die Gmail-Synchronisierung ist fehlgeschlagen. Prüfe das Development-Terminal für Details.",
  
        inbox:
          "Posteingang",
  
        archived:
          "Archiviert",
  
        trash:
          "Papierkorb",
  
        searchInbox:
          "Posteingang durchsuchen...",
  
        searchArchived:
          "Archiv durchsuchen...",
  
        searchTrash:
          "Papierkorb durchsuchen...",
  
        noArchived:
          "Keine archivierten Unterhaltungen",
  
        trashEmpty:
          "Der Papierkorb ist leer",
  
        noConversations:
          "Noch keine Lead-Unterhaltungen",
  
        message:
          "Nachricht",
  
        messages:
          "Nachrichten",
  
        replyReceived:
          "Antwort erhalten",
  
        emailSent:
          "E-Mail gesendet",
  
        markAsRead:
          "Als gelesen markieren",
  
        read:
          "Gelesen",
  
        markAsUnread:
          "Als ungelesen markieren",
  
        unread:
          "Ungelesen",
  
        archive:
          "Archivieren",
  
        restore:
          "Wiederherstellen",
  
        moveToTrash:
          "In den Papierkorb",
  
        deletePermanently:
          "Endgültig löschen",
  
        openLead:
          "Lead öffnen",
  
        noConversationSelected:
          "Keine Unterhaltung ausgewählt",
  
        subject:
          "Betreff",
  
        attachments:
          "Anhänge",
  
        downloadAttachment:
          "Anhang herunterladen",
  
        unknownCompany:
          "Unbekanntes Unternehmen",
  
        companyInbox:
          "Unternehmenspostfach",
  
        outreach:
          "Outreach",
  
        email:
          "E-Mail",
      },
  
      list: {
        deleteConfirmOne:
          "1 Unterhaltung endgültig löschen? Das kann nicht rückgängig gemacht werden.",
  
        deleteConfirmMany:
          "{count} Unterhaltungen endgültig löschen? Das kann nicht rückgängig gemacht werden.",
  
        archiving:
          "{count} werden archiviert...",
  
        restoring:
          "{count} werden wiederhergestellt...",
  
        deleting:
          "{count} werden endgültig gelöscht...",
  
        movingToTrash:
          "{count} werden in den Papierkorb verschoben...",
  
        archivedOne:
          "1 Unterhaltung wurde archiviert.",
  
        archivedMany:
          "{count} Unterhaltungen wurden archiviert.",
  
        restoredOne:
          "1 Unterhaltung wurde wiederhergestellt.",
  
        restoredMany:
          "{count} Unterhaltungen wurden wiederhergestellt.",
  
        deletedOne:
          "1 Unterhaltung wurde endgültig gelöscht.",
  
        deletedMany:
          "{count} Unterhaltungen wurden endgültig gelöscht.",
  
        trashedOne:
          "1 Unterhaltung wurde in den Papierkorb verschoben.",
  
        trashedMany:
          "{count} Unterhaltungen wurden in den Papierkorb verschoben.",
  
        updateFailed:
          "Die ausgewählten Unterhaltungen konnten nicht aktualisiert werden.",
  
        archivingSingle:
          "Wird archiviert...",
  
        threadArchived:
          "Unterhaltung archiviert.",
  
        archiveFailed:
          "Die Unterhaltung konnte nicht archiviert werden.",
  
        noConversations:
          "Keine Unterhaltungen vorhanden",
  
        folderEmpty:
          "Dieser Ordner ist aktuell leer.",
  
        swipeToArchive:
          "Nach rechts wischen zum Archivieren",
  
        selectForActions:
          "Unterhaltungen für Aktionen auswählen",
  
        select:
          "Auswählen",
  
        cancelSelection:
          "Auswahl abbrechen",
  
        selected:
          "ausgewählt",
  
        clear:
          "Leeren",
  
        all:
          "Alle",
  
        archiveSelected:
          "Auswahl archivieren",
  
        restoreSelected:
          "Auswahl wiederherstellen",
  
        restoreSelectedToInbox:
          "Auswahl in den Posteingang verschieben",
  
        deleteSelected:
          "Auswahl löschen",
  
        deleteSelectedPermanently:
          "Auswahl endgültig löschen",
  
        moveSelectedToTrash:
          "Auswahl in den Papierkorb verschieben",
  
        archive:
          "Archivieren",
  
        replied:
          "Geantwortet",
  
        sent:
          "Gesendet",
  
        new:
          "neu",
      },
  
      sync: {
        syncing:
          "Wird synchronisiert...",
  
        sync:
          "Synchronisieren",
      },
  
      composer: {
        serverError:
          "Der Server konnte die Anfrage nicht verarbeiten.",
  
        fileReadFailed:
          "{name} konnte nicht gelesen werden.",
  
        fileEncodeFailed:
          "{name} konnte nicht verarbeitet werden.",
  
        draftRestoredAttachments:
          "Entwurf wiederhergestellt. Bitte füge die Anhänge vor dem Senden erneut hinzu.",
  
        scheduledAttachmentsPreserved:
          "Bestehende geplante Anhänge bleiben erhalten. Brich die Planung ab und erstelle eine neue geplante Antwort, wenn du die Anhänge ändern möchtest.",
  
        maxAttachments:
          "Du kannst bis zu {count} Dateien anhängen.",
  
        fileTooLarge:
          "{name} ist größer als 8 MB.",
  
        totalTooLarge:
          "Anhänge dürfen insgesamt höchstens 12 MB groß sein.",
  
        replaceWithAi:
          "Deine aktuelle Antwort durch einen KI-generierten Entwurf ersetzen?",
  
        generationFailed:
          "Die Antwort konnte nicht generiert werden.",
  
        discardDraftConfirm:
          "Diesen gespeicherten Entwurf verwerfen?",
  
        writeMessageFirst:
          "Schreibe zuerst eine Nachricht.",
  
        replyCouldNotBeSent:
          "Die Antwort konnte nicht gesendet werden.",
  
        replyCouldNotBeScheduled:
          "Die Antwort konnte nicht geplant werden.",
  
        validDate:
          "Wähle ein gültiges Datum und eine gültige Uhrzeit.",
  
        scheduledReplyUpdateFailed:
          "Die geplante Antwort konnte nicht aktualisiert werden.",
  
        cancelScheduledConfirm:
          "Diese geplante Antwort abbrechen? Sie wird nicht gesendet.",
  
        scheduledReplyCancelFailed:
          "Die geplante Antwort konnte nicht abgebrochen werden.",
  
        tomorrowCalculationFailed:
          "Morgen früh konnte nicht berechnet werden.",
  
        loadingReplyStatus:
          "Antwortstatus wird geladen...",
  
        replyScheduled:
          "Antwort geplant",
  
        scheduledFor:
          "Geplant für",
  
        edit:
          "Bearbeiten",
  
        cancel:
          "Abbrechen",
  
        attachment:
          "Anhang",
  
        attachments:
          "Anhänge",
  
        included:
          "enthalten",
  
        scheduledReplyCancelled:
          "Geplante Antwort abgebrochen",
  
        cancelledByReply:
          "Die geplante Antwort wurde automatisch abgebrochen, weil der Lead vorher geantwortet hat.",
  
        cancelledNormally:
          "Die geplante Antwort wurde abgebrochen und wird nicht gesendet.",
  
        writeReply:
          "Antwort schreiben",
  
        scheduledReplyFailed:
          "Geplante Antwort fehlgeschlagen",
  
        scheduledReplyCouldNotBeSent:
          "Die geplante Antwort konnte nicht gesendet werden.",
  
        editReschedule:
          "Bearbeiten & neu planen",
  
        draftSaved:
          "Entwurf gespeichert",
  
        draftSavedDescription:
          "Deine Antwort wird automatisch gespeichert und wiederhergestellt, wenn du zu dieser Unterhaltung zurückkehrst.",
  
        continueDraft:
          "Entwurf fortsetzen",
  
        discard:
          "Verwerfen",
  
        reply:
          "Antwort",
  
        replySent:
          "Antwort erfolgreich gesendet.",
  
        replyDirectlyTo:
          "Direkt antworten an",
  
        editScheduledReply:
          "Geplante Antwort bearbeiten",
  
        updateScheduledMessage:
          "Aktualisiere die Nachricht oder den geplanten Sendezeitpunkt.",
  
        draftSavedAutomatically:
          "Entwurf automatisch gespeichert",
  
        replyingLatestThread:
          "Antwort im neuesten Gmail-Thread",
  
        close:
          "Schließen",
  
        to:
          "An",
  
        generatingReply:
          "Antwort wird generiert...",
  
        writeYourReply:
          "Schreibe deine Antwort...",
  
        total:
          "gesamt",
  
        existingAttachments:
          "Bestehende Anhänge",
  
        existingAttachmentsDescription:
          "Bestehende Anhänge bleiben beim Bearbeiten erhalten. Brich die Planung ab und erstelle eine neue geplante Antwort, um sie zu ändern.",
  
        scheduledSendTime:
          "Geplanter Sendezeitpunkt",
  
        scheduleReply:
          "Antwort planen",
  
        timeZone:
          "Zeitzone",
  
        schedule:
          "Planen",
  
        attachmentsPreserved:
          "Anhänge bleiben beim Bearbeiten erhalten",
  
        attachFiles:
          "Dateien anhängen",
  
        generating:
          "Wird generiert...",
  
        generateReply:
          "Antwort generieren",
  
        discardChanges:
          "Änderungen verwerfen",
  
        saveChanges:
          "Änderungen speichern",
  
        discardDraft:
          "Entwurf verwerfen",
  
        sending:
          "Wird gesendet...",
  
        sendReply:
          "Antwort senden",
  
        scheduleSend:
          "Versand planen",
  
        sendLater:
          "Später senden",
  
        laterToday:
          "Später heute",
  
        tomorrowMorning:
          "Morgen früh",
  
        customDateTime:
          "Eigenes Datum & Uhrzeit",
  
        chooseSendTime:
          "Wähle genau, wann die Nachricht gesendet werden soll",
      },
    },
  } as const;
  
  /* =========================================================
     MESSAGE STATUS
  ========================================================= */
  
  export function getInboxMessageStatusLabel(
    status: string,
    language: AppLanguage
  ) {
    const text =
      inboxCopy[
        language
      ].list;
  
    if (
      status ===
      "Replied"
    ) {
      return text.replied;
    }
  
    return text.sent;
  }