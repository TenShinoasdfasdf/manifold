import { Col } from 'web/components/layout/col'
import clsx from 'clsx'
import { Row } from 'web/components/layout/row'
import { Avatar } from 'web/components/widgets/avatar'
import { RelativeTimestamp } from 'web/components/relative-timestamp'
import { Content } from 'web/components/widgets/editor'
import { User } from 'common/user'
import { ChatMessage } from 'common/chat-message'
import { first } from 'lodash'
import { memo } from 'react'

export const ChatMessageItem = memo(function ChatMessageItem(props: {
  chats: ChatMessage[]
  currentUser: User | undefined | null
  otherUser?: User | null
  onReplyClick?: (chat: ChatMessage) => void
  beforeSameUser: boolean
  firstOfUser: boolean
}) {
  const { chats, currentUser, otherUser, beforeSameUser, firstOfUser } = props
  const chat = first(chats)
  if (!chat) return null
  const isMe = currentUser?.id === chat.userId
  const { username, avatarUrl } =
    !isMe && otherUser
      ? otherUser
      : isMe && currentUser
      ? currentUser
      : { username: '', avatarUrl: undefined }

  return (
    <Row
      className={clsx(
        'items-end justify-start gap-1',
        isMe && 'flex-row-reverse',
        firstOfUser ? 'mt-2' : ''
      )}
    >
      {!isMe && (
        <MessageAvatar
          beforeSameUser={beforeSameUser}
          username={username}
          userAvatarUrl={avatarUrl}
        />
      )}
      <Col className="max-w-[calc(100vw-6rem)] md:max-w-[80%]">
        {firstOfUser && !isMe && chat.visibility !== 'system_status' && (
          <span className="text-ink-500 dark:text-ink-600 pl-3 text-sm">
            {username}
          </span>
        )}
        <Col className="gap-1">
          {chats.map((chat, i) => (
            <div
              className={clsx(
                'group flex items-end gap-1',
                isMe && 'flex-row-reverse'
              )}
              key={chat.id}
            >
              <div
                className={clsx(
                  'rounded-3xl px-3 py-2',
                  chat.visibility !== 'system_status' && 'drop-shadow-sm',
                  chat.visibility === 'system_status'
                    ? 'bg-canvas-50 italic  drop-shadow-none'
                    : isMe
                    ? 'bg-primary-100 items-end self-end rounded-r-none group-first:rounded-tr-3xl'
                    : 'bg-canvas-0 items-start self-start rounded-l-none group-first:rounded-tl-3xl'
                )}
              >
                <Content size={'sm'} content={chat.content} key={chat.id} />
              </div>
              <RelativeTimestamp
                time={chat.createdTime}
                shortened
                className="mb-2 mr-1 hidden text-xs group-last:block"
              />
            </div>
          ))}
        </Col>
      </Col>
      <div className={clsx(isMe ? 'pr-1' : '', 'pb-2')}></div>
    </Row>
  )
})

function MessageAvatar(props: {
  beforeSameUser: boolean
  userAvatarUrl?: string
  username?: string
}) {
  const { beforeSameUser, userAvatarUrl, username } = props
  return (
    <Col
      className={clsx(
        beforeSameUser ? 'pointer-events-none invisible' : '',
        'grow-y justify-end pb-2 pr-1'
      )}
    >
      <Avatar avatarUrl={userAvatarUrl} username={username} size="xs" />
    </Col>
  )
}
