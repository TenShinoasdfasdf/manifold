import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { compact } from 'lodash'
import { getContract, getUser, getValues } from './utils'
import { ContractComment } from '../../common/comment'
import { Bet } from '../../common/bet'
import { Answer } from '../../common/answer'
import { createCommentOrAnswerOrUpdatedContractNotification } from './create-notification'
import { parseMentions, richTextToString } from '../../common/util/parse'
import { addUserToContractFollowers } from './follow-market'

const firestore = admin.firestore()

export const onCreateCommentOnContract = functions
  .runWith({ secrets: ['MAILGUN_KEY'] })
  .firestore.document('contracts/{contractId}/comments/{commentId}')
  .onCreate(async (change, context) => {
    const { contractId } = context.params as {
      contractId: string
    }
    const { eventId } = context

    const contract = await getContract(contractId)
    if (!contract)
      throw new Error('Could not find contract corresponding with comment')

    await change.ref.update({
      contractSlug: contract.slug,
      contractQuestion: contract.question,
    })

    const comment = change.data() as ContractComment
    const lastCommentTime = comment.createdTime

    const commentCreator = await getUser(comment.userId)
    if (!commentCreator) throw new Error('Could not find comment creator')

    await addUserToContractFollowers(contract.id, commentCreator.id)

    await firestore
      .collection('contracts')
      .doc(contract.id)
      .update({ lastCommentTime, lastUpdatedTime: Date.now() })

    let bet: Bet | undefined
    let answer: Answer | undefined
    if (comment.answerOutcome) {
      answer =
        contract.outcomeType === 'FREE_RESPONSE' && contract.answers
          ? contract.answers?.find(
              (answer) => answer.id === comment.answerOutcome
            )
          : undefined
    } else if (comment.betId) {
      const betSnapshot = await firestore
        .collection('contracts')
        .doc(contractId)
        .collection('bets')
        .doc(comment.betId)
        .get()
      bet = betSnapshot.data() as Bet
      answer =
        contract.outcomeType === 'FREE_RESPONSE' && contract.answers
          ? contract.answers.find((answer) => answer.id === bet?.outcome)
          : undefined

      await change.ref.update({
        betOutcome: bet.outcome,
        betAmount: bet.amount,
      })
    }

    const comments = await getValues<ContractComment>(
      firestore.collection('contracts').doc(contractId).collection('comments')
    )
    const repliedToType = answer
      ? 'answer'
      : comment.replyToCommentId
      ? 'comment'
      : undefined

    const repliedUserId = comment.replyToCommentId
      ? comments.find((c) => c.id === comment.replyToCommentId)?.userId
      : answer?.userId

    await createCommentOrAnswerOrUpdatedContractNotification(
      comment.id,
      'comment',
      'created',
      commentCreator,
      eventId,
      richTextToString(comment.content),
      contract,
      {
        repliedToType,
        repliedToId: comment.replyToCommentId || answer?.id,
        repliedToContent: answer ? answer.text : undefined,
        repliedUserId,
        taggedUserIds: compact(parseMentions(comment.content)),
      }
    )
  })
