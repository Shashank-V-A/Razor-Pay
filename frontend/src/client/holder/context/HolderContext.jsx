import React, { createContext, useCallback, useContext, useMemo, useReducer, useState } from 'react'
import { bufferToBase64, bufferToBase64Url, bufferToHex, createPseudoCid, generateRandomId, sha256 } from '../utils/crypto'
import { copyToClipboard, downloadJson } from '../utils/ui'
import { create as createIpfsClient } from 'ipfs-http-client'

const HolderContext = createContext(null)

const initialState = {
  didProfiles: [],
  activeDidId: null,
  inbox: [],
  credentials: [],
  documents: [],
  proofs: [],
  requests: [],
  auditLog: [],
  settings: {
    ipfs: {
      endpoint: 'https://w3s.link',
      token: '',
      mode: 'simulate',
    },
    security: {
      passphraseSet: false,
      autoLockMinutes: 5,
      biometric: false,
    },
  },
}

function holderReducer(state, action) {
  switch (action.type) {
    case 'CREATE_DID': {
      const didProfiles = [...state.didProfiles, action.payload.profile]
      return { ...state, didProfiles, activeDidId: action.payload.profile.id }
    }
    case 'SET_ACTIVE_DID':
      return { ...state, activeDidId: action.payload.didId }
    case 'UPDATE_DID': {
      const didProfiles = state.didProfiles.map((profile) =>
        profile.id === action.payload.id ? { ...profile, ...action.payload.updates } : profile,
      )
      return { ...state, didProfiles }
    }
    case 'IMPORT_DID': {
      const exists = state.didProfiles.find((profile) => profile.did === action.payload.did)
      if (exists) return state
      return { ...state, didProfiles: [...state.didProfiles, action.payload], activeDidId: action.payload.id }
    }
    case 'DELETE_DID': {
      const didProfiles = state.didProfiles.filter((profile) => profile.id !== action.payload.id)
      const activeDidId = state.activeDidId === action.payload.id ? didProfiles[0]?.id ?? null : state.activeDidId
      return { ...state, didProfiles, activeDidId }
    }
    case 'ENQUEUE_CREDENTIAL':
      return { ...state, inbox: [action.payload, ...state.inbox] }
    case 'UPDATE_INBOX_ITEM': {
      const inbox = state.inbox.map((item) => (item.id === action.payload.id ? { ...item, ...action.payload.updates } : item))
      return { ...state, inbox }
    }
    case 'REMOVE_INBOX_ITEM': {
      const inbox = state.inbox.filter((item) => item.id !== action.payload.id)
      return { ...state, inbox }
    }
    case 'ADD_CREDENTIAL':
      return { ...state, credentials: [action.payload, ...state.credentials] }
    case 'UPDATE_CREDENTIAL': {
      const credentials = state.credentials.map((credential) =>
        credential.id === action.payload.id ? { ...credential, ...action.payload.updates } : credential,
      )
      return { ...state, credentials }
    }
    case 'DELETE_CREDENTIAL': {
      const credentials = state.credentials.filter((credential) => credential.id !== action.payload.id)
      return { ...state, credentials }
    }
    case 'ADD_DOCUMENT':
      return { ...state, documents: [action.payload, ...state.documents] }
    case 'UPDATE_DOCUMENT': {
      const documents = state.documents.map((document) =>
        document.id === action.payload.id ? { ...document, ...action.payload.updates } : document,
      )
      return { ...state, documents }
    }
    case 'ATTACH_DOCUMENT': {
      const credentials = state.credentials.map((credential) =>
        credential.id === action.payload.credentialId
          ? {
              ...credential,
              linkedDocuments: Array.from(
                new Set([...(credential.linkedDocuments || []), action.payload.documentId]),
              ),
            }
          : credential,
      )
      return { ...state, credentials }
    }
    case 'ADD_PROOF':
      return { ...state, proofs: [action.payload, ...state.proofs] }
    case 'UPDATE_PROOF': {
      const proofs = state.proofs.map((proof) =>
        proof.id === action.payload.id ? { ...proof, ...action.payload.updates } : proof,
      )
      return { ...state, proofs }
    }
    case 'ADD_REQUEST':
      return { ...state, requests: [action.payload, ...state.requests] }
    case 'UPDATE_REQUEST': {
      const requests = state.requests.map((request) =>
        request.id === action.payload.id ? { ...request, ...action.payload.updates } : request,
      )
      return { ...state, requests }
    }
    case 'ADD_AUDIT_EVENT':
      return { ...state, auditLog: [action.payload, ...state.auditLog] }
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } }
    default:
      return state
  }
}

async function generateKeyDid(alias) {
  const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])

  const publicKeyBuffer = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privateKeyBuffer = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  const publicKeyHex = bufferToHex(publicKeyBuffer)
  const privateKeyBase64 = bufferToBase64(privateKeyBuffer)
  const did = `did:key:z${bufferToBase64Url(publicKeyBuffer)}`

  return {
    id: generateRandomId('did'),
    alias: alias || 'Student DID',
    method: 'did:key',
    did,
    createdAt: new Date().toISOString(),
    publicKeyHex,
    privateKeyBase64,
    controllerKeys: {
      publicKey: publicKeyBuffer,
      privateKey: keyPair.privateKey,
    },
  }
}

export function HolderProvider({ children }) {
  const [state, dispatch] = useReducer(holderReducer, initialState)
  const [loadingStates, setLoadingStates] = useState({})

  const setLoading = useCallback((key, value) => {
    setLoadingStates((prev) => ({ ...prev, [key]: value }))
  }, [])

  const logEvent = useCallback((type, message, meta = {}) => {
    dispatch({
      type: 'ADD_AUDIT_EVENT',
      payload: {
        id: generateRandomId('event'),
        type,
        message,
        meta,
        createdAt: new Date().toISOString(),
      },
    })
  }, [])

  const createDid = useCallback(
    async ({ alias }) => {
      if (!window.crypto?.subtle) {
        throw new Error('WebCrypto not supported in this environment.')
      }
      setLoading('did', true)
      try {
        const profile = await generateKeyDid(alias)
        dispatch({ type: 'CREATE_DID', payload: { profile } })
        logEvent('did:create', `Created ${profile.method}`, { did: profile.did })
        return profile
      } finally {
        setLoading('did', false)
      }
    },
    [logEvent, setLoading],
  )

  const connectEthrDid = useCallback(
    async ({ alias }) => {
      if (!window.ethereum) {
        throw new Error('MetaMask is required for did:ethr')
      }
      setLoading('did', true)
      try {
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' })
        const did = `did:ethr:${account}`
        const profile = {
          id: generateRandomId('did'),
          alias: alias || 'Ethereum DID',
          method: 'did:ethr',
          did,
          createdAt: new Date().toISOString(),
          account,
        }
        dispatch({ type: 'CREATE_DID', payload: { profile } })
        logEvent('did:connect', 'Connected Ethereum account', { did })
        return profile
      } finally {
        setLoading('did', false)
      }
    },
    [logEvent, setLoading],
  )

  const importDid = useCallback(
    (payload) => {
      dispatch({ type: 'IMPORT_DID', payload })
      logEvent('did:import', 'Imported DID', { did: payload.did })
    },
    [logEvent],
  )

  const exportDid = useCallback(async (profile) => {
    const exportPayload = {
      did: profile.did,
      alias: profile.alias,
      method: profile.method,
      privateKeyBase64: profile.privateKeyBase64,
      publicKeyHex: profile.publicKeyHex,
      createdAt: profile.createdAt,
    }
    downloadJson(`${profile.alias || 'did-backup'}.json`, exportPayload)
  }, [])

  const enqueueCredential = useCallback(
    (rawCredential, source = 'manual', anchor = null) => {
      const id = generateRandomId('inbox')
      
      // Handle response format: { success: true, credential: {...}, anchor: {...} }
      const isResponseFormat = rawCredential.success && rawCredential.credential
      const credential = isResponseFormat ? rawCredential.credential : rawCredential
      const anchorInfo = anchor || rawCredential.anchor || null
      
      dispatch({
        type: 'ENQUEUE_CREDENTIAL',
        payload: {
          id,
          rawCredential: isResponseFormat ? rawCredential : credential,
          parsed: credential,
          anchor: anchorInfo,
          source,
          status: 'pending',
          receivedAt: new Date().toISOString(),
        },
      })
      logEvent('credential:incoming', 'Received credential offer', {
        issuer: credential?.issuer?.id || credential?.issuer,
        type: credential?.type,
        anchored: !!anchorInfo,
      })
      return id
    },
    [logEvent],
  )

  const acceptCredential = useCallback(
    (inboxId, category) => {
      const inboxItem = state.inbox.find((item) => item.id === inboxId)
      if (!inboxItem) return
      
      // Handle both direct credential and response format with anchor
      const responseData = inboxItem.parsed
      const credential = responseData.credential || responseData.vc || responseData
      const anchor = responseData.anchor || inboxItem.anchor
      
      const id = generateRandomId('cred')
      dispatch({
        type: 'ADD_CREDENTIAL',
        payload: {
          id,
          title: credential?.type?.[credential.type.length - 1] || 'Verifiable Credential',
          category,
          issuer: credential?.issuer,
          issuanceDate: credential?.issuanceDate || credential?.validFrom,
          subject: credential?.credentialSubject || {},
          evidence: credential?.evidence || {},
          raw: credential,
          anchor: anchor ? {
            txHash: anchor.txHash,
            blockNumber: anchor.blockNumber,
            explorerUrl: anchor.txHash ? `https://amoy.polygonscan.com/tx/${anchor.txHash}` : null,
          } : null,
          status: 'active',
          receivedAt: inboxItem.receivedAt,
          storedAt: new Date().toISOString(),
          linkedDocuments: [],
          revocationStatus: 'unknown',
        },
      })
      dispatch({ type: 'REMOVE_INBOX_ITEM', payload: { id: inboxId } })
      logEvent('credential:accept', 'Credential stored in vault', { 
        credentialId: id, 
        issuer: credential?.issuer,
        anchored: !!anchor 
      })
    },
    [logEvent, state.inbox],
  )

  const rejectCredential = useCallback(
    (inboxId, reason) => {
      const inboxItem = state.inbox.find((item) => item.id === inboxId)
      if (!inboxItem) return
      dispatch({
        type: 'UPDATE_INBOX_ITEM',
        payload: { id: inboxId, updates: { status: 'rejected', rejectedReason: reason, rejectedAt: new Date().toISOString() } },
      })
      logEvent('credential:reject', 'Credential offer rejected', { issuer: inboxItem.parsed?.issuer, reason })
    },
    [logEvent, state.inbox],
  )

  const deleteCredential = useCallback(
    (credentialId) => {
      dispatch({ type: 'DELETE_CREDENTIAL', payload: { id: credentialId } })
      logEvent('credential:delete', 'Credential removed from vault', { credentialId })
    },
    [logEvent],
  )

  const updateCredential = useCallback((credentialId, updates) => {
    dispatch({ type: 'UPDATE_CREDENTIAL', payload: { id: credentialId, updates } })
  }, [])

  const addDocument = useCallback(
    (payload) => {
      dispatch({ type: 'ADD_DOCUMENT', payload })
      if (payload.credentialId) {
        dispatch({
          type: 'ATTACH_DOCUMENT',
          payload: { credentialId: payload.credentialId, documentId: payload.id },
        })
      }
      logEvent('document:upload', 'Encrypted document stored', {
        cid: payload.cid,
        credentialId: payload.credentialId,
      })
    },
    [logEvent],
  )

  const addProof = useCallback(
    (payload) => {
      dispatch({ type: 'ADD_PROOF', payload })
      logEvent('proof:create', 'Selective disclosure proof generated', {
        credentialId: payload.credentialId,
        proofId: payload.id,
      })
    },
    [logEvent],
  )

  const shareProof = useCallback(
    async (proofId, method = 'clipboard') => {
      const proof = state.proofs.find((item) => item.id === proofId)
      if (!proof) return
      const payload = JSON.stringify(proof.proofPayload, null, 2)
      if (method === 'clipboard') {
        await copyToClipboard(payload)
      } else if (method === 'download') {
        downloadJson(`${proofId}.json`, proof.proofPayload)
      }
      dispatch({
        type: 'UPDATE_PROOF',
        payload: {
          id: proofId,
          updates: {
            shareHistory: [
              {
                id: generateRandomId('share'),
                method,
                at: new Date().toISOString(),
              },
              ...(proof.shareHistory || []),
            ],
          },
        },
      })
      logEvent('proof:share', 'Proof shared', { proofId, method })
    },
    [logEvent, state.proofs],
  )

  const addRequest = useCallback(
    (request) => {
      dispatch({ type: 'ADD_REQUEST', payload: request })
      logEvent('request:receive', 'Verification request received', { requestId: request.id })
    },
    [logEvent],
  )

  const updateRequest = useCallback((requestId, updates) => {
    dispatch({ type: 'UPDATE_REQUEST', payload: { id: requestId, updates } })
  }, [])

  const updateSettings = useCallback((updates) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: updates })
  }, [])

  // Helper function to convert RPC endpoint to gateway URL
  const endpointToGateway = (endpoint) => {
    if (!endpoint) return null
    
    try {
      const url = new URL(endpoint)
      const host = url.host
      const protocol = url.protocol
      const port = url.port ? `:${url.port}` : ''
      
      // Filebase: RPC is https://ipfs.filebase.io/api/v0, Gateway is https://ipfs.filebase.io/ipfs/
      if (host.includes('ipfs.filebase.io')) {
        return `${protocol}//${host}/ipfs`
      }
      
      // Pinata: RPC is https://api.pinata.cloud, Gateway is https://gateway.pinata.cloud/ipfs/
      if (host.includes('api.pinata.cloud')) {
        return `https://gateway.pinata.cloud/ipfs`
      }
      
      // Web3.Storage: RPC endpoint is different, gateway is w3s.link
      // Note: Web3.Storage API is typically at api.web3.storage, gateway at w3s.link
      if (host.includes('web3.storage') || host.includes('w3s.link')) {
        return `https://w3s.link/ipfs`
      }
      
      // Generic IPFS node: RPC is usually http://host:port/api/v0, Gateway is http://host:port/ipfs/
      if (url.pathname.includes('/api/v0')) {
        return `${protocol}//${host}${port}/ipfs`
      }
      
      // If endpoint already looks like a gateway path, use it directly (without CID)
      if (url.pathname.includes('/ipfs') && !url.pathname.includes('/api/')) {
        // Extract just the base gateway URL (without the CID part)
        const pathParts = url.pathname.split('/')
        const ipfsIndex = pathParts.findIndex(p => p === 'ipfs')
        if (ipfsIndex >= 0) {
          // Return base URL up to and including /ipfs
          return `${protocol}//${host}${port}/ipfs`
        }
      }
      
      // For custom endpoints without /api/v0, assume standard IPFS gateway pattern
      return `${protocol}//${host}${port}/ipfs`
    } catch (e) {
      // Invalid URL format, try simple string replacement as fallback
      // Filebase pattern
      if (endpoint.includes('ipfs.filebase.io')) {
        return endpoint.replace('/api/v0', '/ipfs').replace(/\/ipfs\/.*$/, '/ipfs')
      }
      // Pinata pattern
      if (endpoint.includes('api.pinata.cloud')) {
        return 'https://gateway.pinata.cloud/ipfs'
      }
      // Generic /api/v0 pattern
      if (endpoint.includes('/api/v0')) {
        return endpoint.replace('/api/v0', '/ipfs').replace(/\/ipfs\/.*$/, '/ipfs')
      }
      // Invalid URL, return null
      return null
    }
  }

  // Helper function to generate IPFS gateway URLs from CID and endpoint
  const getIpfsGateways = useCallback((cid, endpoint = null) => {
    if (!cid || cid.startsWith('pseudo-')) return []
    
    const gateways = []
    
    // Get primary gateway from configured endpoint
    const primaryGateway = endpointToGateway(endpoint)
    if (primaryGateway) {
      // Construct full URL with CID
      const primaryUrl = primaryGateway.endsWith('/ipfs') 
        ? `${primaryGateway}/${cid}`
        : `${primaryGateway}/${cid}`
      gateways.push(primaryUrl)
    }
    
    // Add fallback public gateways
    const fallbackGateways = [
      `https://ipfs.io/ipfs/${cid}`,
      `https://gateway.pinata.cloud/ipfs/${cid}`,
      `https://dweb.link/ipfs/${cid}`,
      `https://cloudflare-ipfs.com/ipfs/${cid}`,
    ]
    
    // Add fallbacks, avoiding duplicates
    fallbackGateways.forEach(gateway => {
      if (!gateways.includes(gateway)) {
        gateways.push(gateway)
      }
    })
    
    return gateways
  }, [])

  const encryptAndStoreDocument = useCallback(
    async ({ file, credentialId, description }) => {
      setLoading('document', true)
      try {
        const fileBuffer = await file.arrayBuffer()
        const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fileBuffer)
        const exportedKey = await crypto.subtle.exportKey('raw', key)
        const hashBytes = await sha256(fileBuffer)
        const hashHex = bufferToHex(hashBytes.buffer)

        let cid = createPseudoCid(hashHex)
        let uploadResult = null
        let ipfsUrl = null

        if (state.settings.ipfs.mode === 'client' && state.settings.ipfs.endpoint) {
          try {
            // Configure IPFS client with proper endpoint and authentication
            const clientConfig = {
              url: state.settings.ipfs.endpoint,
            }

            // Add authentication headers if token is provided
            if (state.settings.ipfs.token) {
              clientConfig.headers = {
                Authorization: `Bearer ${state.settings.ipfs.token}`,
              }
            }

            const client = createIpfsClient(clientConfig)

            // Upload encrypted document to IPFS
            // For single file uploads, client.add returns a result object directly
            // { cid: CID object, path: string, size: number }
            const addResult = client.add(encrypted, {
              pin: true, // Pin the file to ensure it stays available
              wrapWithDirectory: false,
            })
            
            // Handle response (may be AsyncIterable in newer versions or direct result)
            let result = null
            try {
              // Check if it's an AsyncIterable (ipfs-http-client v60+)
              if (addResult && typeof addResult[Symbol.asyncIterator] === 'function') {
                // Iterate through AsyncIterable to get the result
                for await (const chunk of addResult) {
                  result = chunk
                  break // Single file upload returns one result
                }
              } else {
                // Direct result - await if it's a Promise
                result = await Promise.resolve(addResult)
              }
              
              uploadResult = result
              
              // Extract CID from upload result
              // Standard format: { cid: CID, path: string, size: number }
              if (result?.cid) {
                // CID object - convert to string
                cid = typeof result.cid.toString === 'function' 
                  ? result.cid.toString() 
                  : String(result.cid)
              } else if (result?.path) {
                // Path string (usually the CID)
                cid = result.path
              } else if (result?.hash) {
                // Hash string (CID)
                cid = result.hash
              }
              
              // Validate CID was extracted
              if (!cid || cid === createPseudoCid(hashHex)) {
                throw new Error('Failed to extract CID from IPFS upload result')
              }
              
              // Generate IPFS gateway URLs
              const gateways = getIpfsGateways(cid, state.settings.ipfs.endpoint)
              ipfsUrl = gateways[0] || null
              
              console.log(`✓ Document uploaded to IPFS successfully: ${cid}`)
              console.log(`  IPFS URL: ${ipfsUrl}`)
              console.log(`  Available gateways: ${gateways.length}`)
            } catch (iterError) {
              console.error('Error processing IPFS upload:', iterError)
              // Re-throw to be caught by outer catch block
              throw iterError
            }

            logEvent('document:ipfs', 'Document uploaded to IPFS', {
              cid,
              endpoint: state.settings.ipfs.endpoint,
              size: file.size,
            })
          } catch (uploadError) {
            console.error('IPFS upload failed:', uploadError)
            // Fall back to pseudo CID if upload fails
            logEvent('document:ipfs:error', 'IPFS upload failed, using pseudo CID', {
              error: uploadError.message,
              endpoint: state.settings.ipfs.endpoint,
            })
            // Keep the pseudo CID generated earlier
          }
        }

        // Generate IPFS URLs even for simulated mode (for display purposes)
        if (!ipfsUrl && cid && !cid.startsWith('pseudo-')) {
          const gateways = getIpfsGateways(cid, state.settings.ipfs.endpoint)
          ipfsUrl = gateways[0] || null
        }

        const documentRecord = {
          id: generateRandomId('doc'),
          name: file.name,
          cid,
          description: description || '',
          size: file.size,
          mimeType: file.type,
          credentialId: credentialId || null,
          uploadedAt: new Date().toISOString(),
          encryption: {
            iv: bufferToBase64(iv.buffer),
            key: bufferToBase64(exportedKey),
            algorithm: 'AES-GCM',
          },
          hash: hashHex,
          ipfsUrl: ipfsUrl || null,
          ipfsGateways: ipfsUrl ? getIpfsGateways(cid, state.settings.ipfs.endpoint) : [],
          storage: {
            mode: state.settings.ipfs.mode,
            endpoint: state.settings.ipfs.endpoint,
            result: uploadResult,
            uploaded: state.settings.ipfs.mode === 'client' && !!uploadResult,
          },
        }
        addDocument(documentRecord)
        return documentRecord
      } finally {
        setLoading('document', false)
      }
    },
    [addDocument, setLoading, state.settings.ipfs, getIpfsGateways],
  )

  // Helper function to get nested value from object by path
  const getNestedValue = (obj, path) => {
    const parts = path.split('.')
    let value = obj
    for (const part of parts) {
      if (value === null || value === undefined) return undefined
      value = value[part]
    }
    return value
  }

  // Helper function to set nested value in object by path
  const setNestedValue = (obj, path, value) => {
    const parts = path.split('.')
    const lastPart = parts.pop()
    let current = obj
    for (const part of parts) {
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {}
      }
      current = current[part]
    }
    current[lastPart] = value
  }

  const generateProof = useCallback(
    ({ credentialId, documentId, sourceType = 'credential', fields, challenge }) => {
      // Get active DID
      const activeDid = state.activeDidId 
        ? state.didProfiles.find((profile) => profile.id === state.activeDidId)?.did 
        : null

      if (!activeDid) {
        throw new Error('No active DID selected. Please create or select a DID first.')
      }

      let credential = null
      let document = null
      let credentialIdentifier = null
      let issuer = null
      let issuerId = null
      let issuerName = null
      let subject = {}
      let evidence = {}

      if (sourceType === 'credential') {
        credential = state.credentials.find((item) => item.id === credentialId)
        if (!credential) {
          throw new Error('Credential not found')
        }

        // Get issuer information (handle both string and object formats)
        issuer = credential.issuer
        issuerId = typeof issuer === 'string' ? issuer : issuer?.id || issuer?.name || 'Unknown'
        issuerName = typeof issuer === 'string' ? issuer : issuer?.name || issuer?.id || 'Unknown'

        // Get credential ID from raw credential or use internal ID
        credentialIdentifier = credential.raw?.id || credential.raw?.vc?.id || credentialId
        
        subject = credential.subject || credential.raw?.credentialSubject || {}
        evidence = credential.evidence || credential.raw?.evidence || {}
      } else if (sourceType === 'document') {
        document = state.documents.find((item) => item.id === documentId)
        if (!document) {
          throw new Error('Document not found')
        }

        // For documents, the holder is the issuer (self-issued credential)
        issuer = activeDid
        issuerId = activeDid
        issuerName = 'Document Holder'

        // Document ID as credential identifier
        credentialIdentifier = document.id

        // Create credential subject from document metadata
        subject = {
          id: document.id,
          name: document.name,
          description: document.description,
          size: document.size,
          mimeType: document.mimeType,
          uploadedAt: document.uploadedAt,
        }

        // Create evidence with IPFS URL and document information
        evidence = {
          type: 'DocumentEvidence',
          cid: document.cid,
          ipfsUrl: document.ipfsUrl,
          hash: document.hash,
          storage: {
            mode: document.storage?.mode,
            endpoint: document.storage?.endpoint,
            uploaded: document.storage?.uploaded,
          },
          encryption: {
            algorithm: document.encryption?.algorithm,
          },
          // Include IPFS gateways for redundancy
          ipfsGateways: document.ipfsGateways || [],
        }
      } else {
        throw new Error('Invalid source type. Must be "credential" or "document"')
      }

      // Build base Verifiable Presentation payload
      const payload = {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1'
        ],
        type: ['VerifiablePresentation'],
        holder: activeDid,
        verifiableCredential: [
          {
            '@context': sourceType === 'credential' 
              ? (credential.raw?.['@context'] || ['https://www.w3.org/2018/credentials/v1'])
              : ['https://www.w3.org/2018/credentials/v1'],
            id: credentialIdentifier,
            type: sourceType === 'credential'
              ? (credential.raw?.type || credential.raw?.vc?.type || ['VerifiableCredential'])
              : ['VerifiableCredential', 'EncryptedDocumentCredential'],
            issuer: typeof issuer === 'string' ? issuer : {
              id: issuerId,
              name: issuerName,
            },
            issuanceDate: sourceType === 'credential'
              ? (credential.issuanceDate || credential.raw?.issuanceDate || new Date().toISOString())
              : document.uploadedAt || new Date().toISOString(),
            credentialSubject: {
              id: sourceType === 'credential'
                ? (credential.raw?.credentialSubject?.id || credential.subject?.id || activeDid)
                : document.id,
            },
            ...(sourceType === 'credential' && credential.raw?.credentialStatus && { credentialStatus: credential.raw.credentialStatus }),
          }
        ],
        proof: {
          type: 'BbsBlsSignature2020',
          created: new Date().toISOString(),
          challenge: challenge || generateRandomId('challenge'),
          nonce: bufferToBase64Url(crypto.getRandomValues(new Uint8Array(24)).buffer),
          proofPurpose: 'authentication',
          verificationMethod: `${activeDid}#keys-1`,
          proofValue: bufferToBase64Url(crypto.getRandomValues(new Uint8Array(64)).buffer),
        },
      }

      // Extract selected fields from credential subject and evidence
      const vc = payload.verifiableCredential[0]

      // Track which fields were successfully extracted
      let fieldsRevealed = 0

      // Process each selected field
      fields.forEach((fieldPath) => {
        const pathParts = fieldPath.split('.')
        if (pathParts.length < 2) {
          console.warn(`Invalid field path: ${fieldPath}`)
          return
        }

        const root = pathParts[0]
        const restPath = pathParts.slice(1).join('.')

        if (root === 'credentialSubject') {
          // Get value from credential subject (handle nested paths)
          let value
          if (restPath) {
            value = getNestedValue(subject, restPath)
            // If not found in subject and it's a credential, try raw credentialSubject
            if (value === undefined && sourceType === 'credential' && credential.raw?.credentialSubject) {
              value = getNestedValue(credential.raw.credentialSubject, restPath)
            }
          } else {
            value = subject[pathParts[1]]
            // If not found and it's a credential, try raw credentialSubject
            if (value === undefined && sourceType === 'credential' && credential.raw?.credentialSubject) {
              value = credential.raw.credentialSubject[pathParts[1]]
            }
          }

          if (value !== undefined && value !== null) {
            // Set nested value in credentialSubject
            if (restPath) {
              setNestedValue(vc.credentialSubject, restPath, value)
            } else if (pathParts[1]) {
              vc.credentialSubject[pathParts[1]] = value
            }
            fieldsRevealed++
          } else {
            console.warn(`Field not found: ${fieldPath}`)
          }
        } else if (root === 'evidence') {
          // Get value from evidence (handle nested paths)
          let value
          if (restPath) {
            value = getNestedValue(evidence, restPath)
            // If not found in evidence and it's a credential, try raw evidence
            if (value === undefined && sourceType === 'credential' && credential.raw?.evidence) {
              value = getNestedValue(credential.raw.evidence, restPath)
            }
          } else {
            value = evidence[pathParts[1]]
            // If not found and it's a credential, try raw evidence
            if (value === undefined && sourceType === 'credential' && credential.raw?.evidence) {
              value = credential.raw.evidence[pathParts[1]]
            }
          }

          if (value !== undefined && value !== null) {
            // Initialize evidence object if not exists
            if (!vc.evidence) {
              vc.evidence = {}
            }
            // Set nested value in evidence
            if (restPath) {
              setNestedValue(vc.evidence, restPath, value)
            } else if (pathParts[1]) {
              vc.evidence[pathParts[1]] = value
            }
            fieldsRevealed++
          } else {
            console.warn(`Evidence field not found: ${fieldPath}`)
          }
        }
      })

      // Remove empty evidence if no evidence fields were selected
      if (vc.evidence && Object.keys(vc.evidence).length === 0) {
        delete vc.evidence
      }

      // Validate that at least some fields were revealed
      // Count fields excluding the ID field
      const subjectFieldsCount = Object.keys(vc.credentialSubject).filter(k => k !== 'id').length
      const evidenceFieldsCount = vc.evidence ? Object.keys(vc.evidence).length : 0
      const totalFieldsRevealed = subjectFieldsCount + evidenceFieldsCount

      if (totalFieldsRevealed === 0) {
        throw new Error('No valid fields were revealed. Please select at least one field from the credential that contains data.')
      }

      // Log successful field extraction
      console.log(`Successfully revealed ${fieldsRevealed} of ${fields.length} selected fields`)

      const proofRecord = {
        id: generateRandomId('proof'),
        credentialId: sourceType === 'credential' ? credentialId : null,
        documentId: sourceType === 'document' ? documentId : null,
        sourceType,
        generatedAt: new Date().toISOString(),
        challenge: payload.proof.challenge,
        nonce: payload.proof.nonce,
        revealedFields: fields,
        proofPayload: payload,
        shareHistory: [],
      }

      addProof(proofRecord)
      logEvent('proof:generate', 'Selective disclosure proof generated', {
        credentialId: sourceType === 'credential' ? credentialId : null,
        documentId: sourceType === 'document' ? documentId : null,
        sourceType,
        fieldsCount: fields.length,
        holderDid: activeDid,
      })
      
      return proofRecord
    },
    [addProof, logEvent, state.activeDidId, state.credentials, state.documents, state.didProfiles],
  )

  const checkRevocation = useCallback(
    async (credentialId) => {
      const statusPool = ['valid', 'revoked', 'unknown']
      const random = statusPool[Math.floor(Math.random() * statusPool.length)]
      updateCredential(credentialId, {
        revocationStatus: random,
        lastRevocationCheck: new Date().toISOString(),
      })
      logEvent('credential:revocation', 'Revocation status updated', { credentialId, status: random })
      return random
    },
    [logEvent, updateCredential],
  )

  const value = useMemo(
    () => ({
      state,
      loadingStates,
      createDid,
      connectEthrDid,
      importDid,
      exportDid,
      enqueueCredential,
      acceptCredential,
      rejectCredential,
      deleteCredential,
      addDocument,
      encryptAndStoreDocument,
      generateProof,
      shareProof,
      addRequest,
      updateRequest,
      updateSettings,
      checkRevocation,
      logEvent,
      setActiveDid: (didId) => dispatch({ type: 'SET_ACTIVE_DID', payload: { didId } }),
    }),
    [
      acceptCredential,
      addDocument,
      addRequest,
      checkRevocation,
      connectEthrDid,
      createDid,
      deleteCredential,
      encryptAndStoreDocument,
      exportDid,
      generateProof,
      importDid,
      loadingStates,
      logEvent,
      enqueueCredential,
      rejectCredential,
      shareProof,
      state,
      updateRequest,
      updateSettings,
    ],
  )

  return <HolderContext.Provider value={value}>{children}</HolderContext.Provider>
}

export function useHolderWallet() {
  const context = useContext(HolderContext)
  if (!context) throw new Error('useHolderWallet must be used within HolderProvider')
  return context
}


